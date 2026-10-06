// Pull every icon, illustration and image asset out of the captured pages into
// assets/, one file each, named and deduplicated, with a manifest of where each
// one is used.
//
//   node scripts/extract-assets.mjs
//
// Sources: inline <svg> icons in the page HTML, data: images in the CSS, and
// files the pages load from www.olx.com.pk/assets/ (downloaded once). Listing
// photos (images.olx.com.pk) are ad content posted by users, not design assets,
// so they are left out.
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const OUT = 'assets';
const ORIGIN = 'https://www.olx.com.pk';
const PORT = 8771;
const sha = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10);
const slug = (s) => s.toLowerCase().replace(/&amp;/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
const camelToSlug = (s) => s.replace(/_noinline$/, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const pages = [];
for (const id of await readdir('site/pages')) {
  for (const vp of ['desktop', 'mobile']) if (existsSync(`site/pages/${id}/${vp}.html`)) pages.push({ id, vp, file: `site/pages/${id}/${vp}.html` });
}

// ---------- 1. Inline SVG icons, named from where they sit in the page ----------
const http = await import('node:http');
const server = http.createServer(async (req, res) => {
  try {
    const body = await readFile(`.${decodeURIComponent(req.url.split('?')[0])}`);
    res.writeHead(200, { 'content-type': req.url.endsWith('.css') ? 'text/css' : 'text/html' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(PORT);

const browser = await chromium.launch();
const ctx = await browser.newContext();
// Only the page and its CSS are needed; photos and fonts would just slow it down.
await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
const svgs = new Map(); // normalized markup -> record
for (const p of pages) {
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/${p.file}`, { waitUntil: 'domcontentloaded' });
  const found = await page.evaluate(() => {
    const label = (svg) => {
      const own = svg.getAttribute('aria-label') || svg.querySelector('title')?.textContent;
      if (own) return own;
      for (let el = svg.parentElement, depth = 0; el && depth < 4; el = el.parentElement, depth++) {
        const a = el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('alt');
        if (a && a.length < 40) return a;
        const text = el.innerText?.trim();
        if (text && text.length < 30 && !/\d{3,}/.test(text)) return text;
      }
      return '';
    };
    return [...document.querySelectorAll('svg')].filter((s) => !s.parentElement.closest('svg')).map((svg) => {
      const r = svg.getBoundingClientRect();
      const c = svg.cloneNode(true);
      // Keep the drawing, not the page's class names.
      c.removeAttribute('class');
      c.querySelectorAll('[class]').forEach((e) => e.removeAttribute('class'));
      if (!c.getAttribute('xmlns')) c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const color = getComputedStyle(svg).fill;
      return { markup: c.outerHTML, label: label(svg), w: Math.round(r.width), h: Math.round(r.height), color };
    });
  });
  for (const s of found) {
    if (!/<(path|circle|rect|polygon|g|ellipse|line|polyline)\b/.test(s.markup)) continue;
    const key = s.markup.replace(/\s+/g, ' ').replace(/ (width|height)="[^"]*"/g, '');
    const rec = svgs.get(key) ?? { markup: s.markup, labels: new Map(), sizes: new Set(), pages: new Set(), color: s.color };
    if (s.label) rec.labels.set(s.label, (rec.labels.get(s.label) ?? 0) + 1);
    if (s.w && s.h) rec.sizes.add(`${s.w}×${s.h}`);
    rec.pages.add(`${p.id}~${p.vp}`);
    svgs.set(key, rec);
  }
  await page.close();
}
await browser.close();
server.close();

// ---------- 2. Images embedded in the CSS ----------
const cssImages = new Map();
for (const f of await readdir('site/css')) {
  const css = await readFile(`site/css/${f}`, 'utf8');
  // The URI is quoted with " and may contain ' (or the other way round).
  for (const m of css.matchAll(/([.#][^{}]{0,120})\{[^{}]*?url\((?:"(data:image\/(svg\+xml|png|gif|webp)[^"]*)"|'(data:image\/(svg\+xml|png|gif|webp)[^']*)')\)/g)) {
    const [, selector, u1, t1, u2, t2] = m;
    const uri = u1 ?? u2, type = t1 ?? t2;
    const rec = cssImages.get(uri) ?? { uri, type, selectors: new Set() };
    rec.selectors.add(selector.trim().split(/\s*,\s*/).pop());
    cssImages.set(uri, rec);
  }
}

// ---------- 3. Files from www.olx.com.pk/assets/ ----------
const remote = new Map(); // url -> pages
const usedOn = (url, where) => { if (!remote.has(url)) remote.set(url, new Set()); remote.get(url).add(where); };
for (const p of pages) {
  const html = await readFile(p.file, 'utf8');
  for (const m of html.matchAll(/(?:https:\/\/www\.olx\.com\.pk)?(\/assets\/[^\s"'()<>?]+\.(?:svg|png|webp|jpe?g|gif|ico))/g)) usedOn(ORIGIN + m[1], `${p.id}~${p.vp}`);
}
for (const f of await readdir('site/css')) {
  const css = await readFile(`site/css/${f}`, 'utf8');
  for (const m of css.matchAll(/(?:https:\/\/www\.olx\.com\.pk)?(\/assets\/[^\s"'()<>?]+\.(?:svg|png|webp|jpe?g|gif|ico))/g)) usedOn(ORIGIN + m[1], 'css');
}

// ---------- Write the library ----------
await rm(OUT, { recursive: true, force: true });
for (const d of ['icons', 'categories', 'illustrations', 'images', 'logos', 'css-icons']) await mkdir(`${OUT}/${d}`, { recursive: true });
const manifest = { source: ORIGIN, extracted: new Date().toISOString().slice(0, 10), assets: [] };
const taken = new Set();
const unique = (dir, base, ext) => { let n = base || 'icon', i = 2; while (taken.has(`${dir}/${n}.${ext}`)) n = `${base}-${i++}`; taken.add(`${dir}/${n}.${ext}`); return `${dir}/${n}.${ext}`; };

for (const rec of svgs.values()) {
  // Labels taken from nearby text can carry ad values ("5 Bedrooms", "Area 20 Marla"); keep the words.
  const clean = (l) => l.replace(/[\d.,:]+/g, ' ').replace(/\b(marla|kanal|sq|ft|yd|km|rs|lac|lakh|crore)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  const best = [...rec.labels.entries()].map(([l, n]) => [clean(l), n]).filter(([l]) => l.length > 1).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  const file = unique(`${OUT}/icons`, slug(best) || `icon-${sha(rec.markup)}`, 'svg');
  await writeFile(file, rec.markup + '\n');
  manifest.assets.push({ kind: 'icon', name: best || 'Unlabelled icon', file, source: 'inline SVG', sizes: [...rec.sizes], usedOn: [...rec.pages].sort() });
}
for (const rec of cssImages.values()) {
  const ext = rec.type === 'svg+xml' ? 'svg' : rec.type;
  const [, meta, data] = rec.uri.match(/^data:[^,]*?(;base64)?,(.*)$/s) ?? [];
  const body = meta ? Buffer.from(data, 'base64') : decodeURIComponent(data);
  const sel = [...rec.selectors][0] ?? '';
  const file = unique(`${OUT}/css-icons`, slug(sel.replace(/^[.#]/, '')) || `css-${sha(rec.uri)}`, ext);
  await writeFile(file, body);
  manifest.assets.push({ kind: 'css-icon', name: sel || 'CSS image', file, source: 'data URI in CSS', selectors: [...rec.selectors] });
}
let failed = 0;
for (const [url, where] of remote) {
  const base = url.split('/').pop().replace(/\.[0-9a-f]{32}(?=\.)/, '');
  const [stem, ext] = [base.replace(/\.[^.]+$/, ''), base.split('.').pop()];
  const kind = /^(animals|bikes|books-sports-hobbies|business-industrial-agriculture|electronics-home-appliances|fashion-beauty|furniture-home-decor|jobs|kids|mobiles|property-for-rent|property-for-sale|services|vehicles)$/.test(stem) ? 'category'
    : /^icon|_noinline$/.test(stem) && ext === 'svg' ? 'icon'
    : /logo|brand|dubizzle|appstore|googleplay|appgallery|flags/i.test(stem) ? 'logo'
    : ext === 'svg' || /illustration|choose|empty|error|inspection|banner|widget/i.test(stem) ? 'illustration' : 'image';
  const dir = { category: 'categories', icon: 'icons', logo: 'logos', illustration: 'illustrations', image: 'images' }[kind];
  const res = await fetch(url).catch(() => null);
  if (!res?.ok) { failed++; continue; }
  const file = unique(`${OUT}/${dir}`, camelToSlug(stem), ext);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  manifest.assets.push({ kind, name: camelToSlug(stem).replace(/-/g, ' '), file, source: url, usedOn: [...where].sort() });
}
// Names for icons whose label came out generic or empty, chosen by looking at
// them (keyed by the generated file name; regenerating the same captures gives
// the same names).
const NAMES = {
  'icons/account-2': 'user-outline', 'icons/account': 'user-filled',
  'icons/back-button-2': 'chevron-left-small', 'icons/back-button-3': 'close', 'icons/back-button-4': 'chevron-left', 'icons/back-button': 'chevron-left-bold',
  'icons/chat-2': 'chat-bubble-dots', 'icons/chat': 'chat-bubble',
  'icons/follow-us': 'social-x', 'icons/follow-us-2': 'social-facebook', 'icons/follow-us-3': 'social-youtube', 'icons/follow-us-4': 'social-instagram',
  'icons/follow-us-5': 'social-x-light', 'icons/follow-us-6': 'social-facebook-light', 'icons/follow-us-7': 'social-youtube-light', 'icons/follow-us-8': 'social-instagram-light',
  'icons/home': 'tab-home-filled', 'icons/home-2': 'chevron-right-small', 'icons/home-3': 'tab-home-outline',
  'icons/icon-1821ccf2c0': 'search-not-found', 'icons/icon-1c32e89648': 'badge-app-store', 'icons/icon-7fd07751e7': 'badge-app-gallery', 'icons/icon-c2808a8f55': 'badge-google-play',
  'icons/icon-3dbd49b950': 'arrow-right', 'icons/icon-4cf64d7600': 'arrow-right-small', 'icons/icon-663e11e0fa': 'arrow-left', 'icons/play-this-song': 'arrow-right-large',
  'icons/icon-5b21244ebc': 'calendar', 'icons/icon-a695650cfd': 'calendar-clock', 'icons/icon-5f3780994e': 'search-small', 'icons/icon-6d04eed059': 'camera',
  'icons/icon-a9a46569b7': 'chevron-left-large', 'icons/icon-e1bf16e7c1': 'chevron-down', 'icons/land-plots-2': 'chevron-down-small', 'icons/pakistan-2': 'chevron-down-medium',
  'icons/icon-e8170386a1': 'star', 'icons/land-plots': 'home-outline-small',
  'icons/motors-property': 'logo-olx-small', 'icons/motors-property-2': 'logo-olx', 'icons/side-menu': 'logo-olx-menu',
  'icons/pakistan': 'location-pin', 'icons/pakistan-3': 'location-pin-blue', 'icons/qzxqzxnothing-in-pakistan': 'grid-small',
  'icons/sell': 'sell-ring', 'icons/sell-2': 'plus', 'icons/sell-3': 'sell-ring-compact',
  'icons/side-menu-2': 'tab-home', 'icons/side-menu-3': 'tab-chats', 'icons/side-menu-4': 'tab-my-ads', 'icons/side-menu-5': 'tab-account',
  'css-icons/04b4fc66': 'bathtub', 'css-icons/12f08450': 'features-grid', 'css-icons/14bcb66e': 'grid-view-large', 'css-icons/36122c3f-checked-after': 'radio-checked',
  'css-icons/44abf0fe': 'location-pin-outline', 'css-icons/4d61f21d': 'chevron-right-large', 'css-icons/844e565f': 'caret-down-small', 'css-icons/844e565f-2': 'caret-down-small-2',
  'css-icons/8ed7dc29': 'chevron-down-outline', 'css-icons/a56d4d1b-checked-after': 'checkbox-checked', 'css-icons/b4de058f-checked-after': 'checkbox-checked-large',
  'css-icons/a98dc5d6': 'price-tag', 'css-icons/af21e118': 'fullscreen', 'css-icons/b021e5af': 'caret-down-light', 'css-icons/baa5c67e': 'chevron-up-grey',
  'css-icons/bec71066': 'buildings', 'css-icons/cefab989-details-summary-before': 'chevron-up-small', 'css-icons/d0920ce6': 'chevron-right-bold', 'css-icons/d1a6b9e2': 'sofa',
  'css-icons/e45aa49f-before': 'ribbon-corner', 'css-icons/f5a6a0db': 'chevron-up', 'css-icons/f9f2326f': 'check-circle',
  'css-icons/f562d172-before': 'hexagon', 'css-icons/f562d172-before-2': 'hexagon-2', 'css-icons/f562d172-before-3': 'hexagon-3', 'css-icons/f562d172-before-4': 'hexagon-4', 'css-icons/f562d172-before-5': 'hexagon-5',
  'css-icons/168ef626': 'pattern', 'css-icons/168ef626-2': 'pattern-2', 'css-icons/168ef626-3': 'pattern-3', 'css-icons/168ef626-4': 'pattern-4', 'css-icons/168ef626-5': 'pattern-5',
  'css-icons/5f6f7a56': 'window-minimize-white', 'css-icons/7d2ddb84': 'window-maximize-white', 'css-icons/8616fd02-f4ff73d6': 'fullscreen-white',
  'css-icons/8c4d8466-dark': 'pattern-dark', 'css-icons/8c4d8466-light': 'pattern-light',
};
const { rename } = await import('node:fs/promises');
for (const a of manifest.assets) {
  const key = a.file.slice(OUT.length + 1).replace(/\.[^.]+$/, '');
  const name = NAMES[key];
  if (!name) continue;
  const to = `${OUT}/${key.split('/')[0]}/${name}${a.file.match(/\.[^.]+$/)[0]}`;
  await rename(a.file, to);
  a.file = to; a.name = name.replace(/-/g, ' ');
}
manifest.assets.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
await writeFile(`${OUT}/index.json`, JSON.stringify(manifest, null, 1) + '\n');
const count = (k) => manifest.assets.filter((a) => a.kind === k).length;
console.log(`${OUT}/: ${count('icon')} icons, ${count('css-icon')} CSS icons, ${count('category')} category illustrations, ${count('illustration')} illustrations, ${count('logo')} logos, ${count('image')} images${failed ? `; ${failed} downloads failed` : ''}`);
