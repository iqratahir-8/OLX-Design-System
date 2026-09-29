// Snapshot live olx.com.pk pages and components as static, self-contained HTML.
//
//   node scripts/snapshot-live.mjs            # all pages, desktop + mobile
//   node scripts/snapshot-live.mjs home       # one page
//
// Output
//   templates/<page>/<viewport>.html   full page, scripts removed, CSS inlined
//   templates/<page>/<viewport>.png    screenshot of the live page at capture time
//   components/<name>/<viewport>.html  the component's live markup, linking components/_css/<page>-<viewport>.css
//   components/<name>/<viewport>.png   screenshot of the live element
//   components/index.json              what was captured, from where, and its size
//
// The HTML keeps OLX's own class names and CSS, so it renders the same as the
// live site. Images load from OLX's servers. Fonts load from ../../fonts/ first
// (run `npm run fetch-fonts`; the folder is git-ignored because Geomanist is a
// licensed font) and fall back to olx.com.pk.
import { chromium, devices } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';

const ORIGIN = 'https://www.olx.com.pk';

// path: where to load. only: restrict to some viewports. steps: taps to reach the state.
// On a first visit the mobile site asks for a location before showing the home page,
// so those two screens are captured as templates of their own.
const pages = {
  home: { path: '/', steps: { mobile: ['Other address', 'See all in Pakistan'] } },
  'location-prompt': { path: '/', only: ['mobile'] },
  'location-select': { path: '/', only: ['mobile'], steps: { mobile: ['Other address'] } },
  'search-results': { path: '/items/q-iphone' },
  'category-listing': { path: '/mobile-phones_c1453' },
  'ad-detail': { path: null }, // resolved at run time: ads expire
};

const viewports = {
  desktop: { viewport: { width: 1440, height: 900 } },
  mobile: devices['iPhone 13'],
};

// Components to cut out of each page. `find` runs in the page with helpers:
//   $(sel)            document.querySelector
//   byLabel(label)    [aria-label="label"]
//   around(...texts)  smallest visible element whose text contains every string
//   deepest(test)     innermost visible element passing test(el)
//   up(el, n)         nth ancestor
//   fullWidth(el, h)  nearest ancestor spanning the viewport and at least h px tall
// A [find, viewports] pair limits a component to those viewports.
const components = {
  home: {
    header: [`$('header')`, ['desktop']],
    'top-bar': [`$('header')?.firstElementChild`, ['desktop']],
    'login-button': [`byLabel('Login')`, ['desktop']],
    'sell-button': `(() => { let e = deepest((el) => el.textContent.trim().toLowerCase() === 'sell'); while (e && e.getBoundingClientRect().height < 44) e = e.parentElement; return e; })()`,
    'search-row': [`up(byLabel('Search input'), 3)`, ['desktop']],
    'search-bar': [`up(byLabel('Search input'), 2)`, ['desktop']],
    'location-picker': [`up(byLabel('Location input'), 1)`, ['desktop']],
    'category-nav': [`up(deepest((el) => el.tagName === 'A' && el.textContent.trim() === 'Motorcycles'), 3)`, ['desktop']],
    'mobile-header': [`fullWidth(deepest((el) => el.textContent.trim() === 'Motors'), 100)`, ['mobile']],
    'mobile-location-bar': [`up(deepest((el) => el.textContent.trim() === 'Pakistan'), 3)`, ['mobile']],
    'category-tiles': `up($('img[alt="Mobiles"]'), 4)`,
    'category-tile': `up($('img[alt="Mobiles"]'), 2)`,
    'listing-section': `byLabel('Category with hits section')`,
    'listing-card': `byLabel('Title')?.closest('article, li')`,
    'app-banner': [`deepest((el) => el.textContent.includes('Find amazing deals') && el.querySelector('img[alt="App Gallery"]'))`, ['desktop']],
    footer: `$('footer')`,
    'copyright-bar': `(() => { let e = deepest((el) => el.textContent.trim().startsWith('Classifieds in Pakistan')); while (e && e.parentElement && e.parentElement.tagName !== 'FOOTER') e = e.parentElement; return e; })()`,
  },
  'category-listing': {
    breadcrumb: `byLabel('Breadcrumb')`,
    'page-title': [`up(byLabel('Ads count'), 1)`, ['desktop']],
    'filters-sidebar': [`byLabel('Filters list')`, ['desktop']],
    'categories-filter': [`byLabel('Categories filter')`, ['desktop']],
    'brand-chips': `around('iPhone', 'Infinix', 'Samsung', 'Nokia')`,
    'listing-toolbar': [`around('View', 'Sort by')`, ['desktop']],
    'listing-row-featured': `byLabel('Featured')?.closest('[aria-label="Listing"]')`,
    // Cards in the "Buy with Delivery" strip (every wide row on page 1 is a featured ad).
    'delivery-card': `[...document.querySelectorAll('[aria-label="Listing"]')].find((l) => !l.querySelector('[aria-label="Featured"]'))`,
  },
  'ad-detail': {
    gallery: `byLabel('Gallery')`,
    'ad-overview': `byLabel('Overview')`,
    'ad-details': `byLabel('Details')`,
    'ad-description': `byLabel('Description')`,
    'seller-sidebar': [`byLabel('Seller description')`, ['desktop']],
    'seller-card': [`deepest((el) => el.textContent.trim() === 'Posted by')?.closest('a')`, ['desktop']],
    'show-phone-button': [`deepest((el) => el.tagName === 'BUTTON' && el.textContent.trim() === 'Show phone number')`, ['desktop']],
    'chat-button': [`[...(byLabel('Seller description')?.querySelectorAll('button') ?? [])].find((b) => b.textContent.trim() === 'Chat')`, ['desktop']],
    'seller-card-mobile': [`byLabel('Seller description')`, ['mobile']],
    'contact-bar': [`fullWidth(deepest((el) => el.tagName === 'BUTTON' && el.textContent.trim() === 'Chat'), 60)`, ['mobile']],
    'related-ads': `byLabel('Related Ads')`,
    'safety-tips': `around('Your safety matters to us', 'Never pay')`,
  },
};

// Remove interactive/ads/tracking noise and anything personal, make every URL absolute,
// and inline stylesheets. Runs in the page; returns the cleaned full-page HTML.
function freezePage(origin) {
  const abs = (u) => { try { return new URL(u, location.href).href; } catch { return u; } };
  const absCss = (css) => css.replace(/url\((['"]?)(?!data:|https?:|#)([^'")]+)\1\)/g, (_, q, u) => `url(${q}${abs(u)}${q})`);

  // Scripts, ad slots and third-party frames do nothing in a static copy.
  document.querySelectorAll('script, iframe, noscript, link[rel="preload"], link[rel="prefetch"], link[rel="modulepreload"], link[rel="dns-prefetch"], link[rel="preconnect"]').forEach((e) => e.remove());
  // OLX's "Your notifications are off" tooltip.
  const note = [...document.querySelectorAll('h2')].find((e) => /notifications are off/i.test(e.textContent));
  for (let e = note; e && e !== document.body; e = e.parentElement) {
    const p = getComputedStyle(e).position;
    if (p === 'fixed' || p === 'absolute') { e.remove(); break; }
  }

  // Personal data: seller names/photos and phone numbers typed into ads.
  document.querySelectorAll('[aria-label="User photo"]').forEach((img) => { img.removeAttribute('src'); img.removeAttribute('srcset'); });
  const seller = document.querySelector('[aria-label="Seller description"]');
  if (seller) {
    const label = [...seller.querySelectorAll('*')].find((e) => e.children.length === 0 && /^Posted by$/i.test(e.textContent.trim()));
    const name = label?.nextElementSibling ?? label?.parentElement?.nextElementSibling;
    if (name) name.textContent = 'Seller name';
  }
  // Phone numbers in ad titles and text (also in title/alt/aria-label attributes).
  const phone = /(\+?92[\s-]?|\b0)3\d{2}[\s-]?\d{7}\b|\b\d{4}[\s-]\d{7}\b/g;
  const redact = (v) => v.replace(phone, '03XX-XXXXXXX');
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) { const v = redact(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
  for (const el of document.body.querySelectorAll('*')) {
    for (const attr of [...el.attributes]) {
      if (['src', 'srcset', 'href', 'style', 'class'].includes(attr.name)) continue;
      const v = redact(attr.value);
      if (v !== attr.value) el.setAttribute(attr.name, v);
    }
  }

  // Absolute URLs everywhere so the copy renders from any location.
  for (const el of document.querySelectorAll('[src], [href], [srcset], [poster]')) {
    for (const a of ['src', 'href', 'poster']) if (el.hasAttribute(a) && !el.getAttribute(a).startsWith('data:')) el.setAttribute(a, abs(el.getAttribute(a)));
    if (el.hasAttribute('srcset')) el.setAttribute('srcset', el.getAttribute('srcset').split(',').map((s) => { const [u, d] = s.trim().split(/\s+/); return [abs(u), d].filter(Boolean).join(' '); }).join(', '));
  }
  document.querySelectorAll('[style]').forEach((el) => el.setAttribute('style', absCss(el.getAttribute('style'))));
  document.querySelectorAll('style').forEach((s) => { s.textContent = absCss(s.textContent); });
  // Links become inert: the copy is for looking at, not navigating.
  document.querySelectorAll('a[href]').forEach((a) => a.setAttribute('href', '#'));
  document.querySelectorAll('form[action]').forEach((f) => f.removeAttribute('action'));
  return origin;
}

async function inlineStylesheets(page) {
  return page.evaluate(async () => {
    const abs = (u, base) => { try { return new URL(u, base).href; } catch { return u; } };
    for (const link of [...document.querySelectorAll('link[rel="stylesheet"]')]) {
      try {
        const res = await fetch(link.href);
        if (!res.ok) continue;
        const css = (await res.text()).replace(/url\((['"]?)(?!data:|https?:|#)([^'")]+)\1\)/g, (_, q, u) => `url(${q}${abs(u, link.href)}${q})`);
        const style = document.createElement('style');
        style.dataset.from = link.href;
        style.textContent = css;
        link.replaceWith(style);
      } catch { /* cross-origin sheet: keep the <link> */ }
    }
  });
}

// Prefer locally fetched fonts (git-ignored) so the copy matches pixel for pixel.
async function fontOverrides(page) {
  const faces = await page.evaluate(() => [...document.querySelectorAll('style')]
    .flatMap((s) => s.textContent.match(/@font-face\s*\{[^}]*\}/g) ?? []));
  const seen = new Set();
  return faces.map((face) => {
    const file = face.match(/url\(["']?[^"')]*\/([^/"')]+\.woff2)/)?.[1];
    if (!file || seen.has(face)) return '';
    seen.add(face);
    return face.replace(/src:[^;}]+/, (src) => `src:url("../../fonts/${file}") format("woff2"),${src.slice(4)}`);
  }).join('\n');
}

function cropPng(buffer, { x, y, width, height }, dpr) {
  const src = PNG.sync.read(buffer);
  const sx = Math.max(0, x * dpr), sy = Math.max(0, y * dpr);
  const w = Math.min(width * dpr, src.width - sx), h = Math.min(height * dpr, src.height - sy);
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(src, out, sx, sy, w, h, 0, 0);
  return PNG.sync.write(out);
}

const docShell = ({ title, htmlAttrs, bodyAttrs, head, body }) => `<!doctype html>
<html ${htmlAttrs}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${head}
</head>
<body ${bodyAttrs}>
${body}
</body>
</html>
`;

async function capture(browser, pageName, { path, steps }, vp) {
  const context = await browser.newContext(viewports[vp]);
  const page = await context.newPage();
  try {
    await page.goto(ORIGIN + path, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForTimeout(3000);
    for (const label of steps?.[vp] ?? []) {
      await page.getByText(label, { exact: true }).first().click({ timeout: 10_000 });
      await page.waitForTimeout(2500);
    }
    // Scroll so lazy images and sections render, then back to the top.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 200)); }
      scrollTo(0, 0);
    });
    await page.waitForTimeout(1500);
    await inlineStylesheets(page);
    await page.evaluate(freezePage, ORIGIN);
    await page.waitForTimeout(300);

    const dir = `templates/${pageName}`;
    await mkdir(dir, { recursive: true });
    // Lay the page out at its full height (what a full-page screenshot does) and
    // measure everything in that one state: fixed and sticky elements then sit where
    // the template render puts them, and nothing has been scrolled.
    const contentHeight = () => page.evaluate(() => {
      scrollTo(0, 0);
      document.querySelectorAll('*').forEach((e) => { if (e.scrollTop) e.scrollTop = 0; });
      let bottom = document.documentElement.scrollHeight;
      for (const e of document.body.querySelectorAll('*')) bottom = Math.max(bottom, e.getBoundingClientRect().bottom);
      return Math.ceil(bottom);
    });
    const vpSize = page.viewportSize();
    let fullHeight = await contentHeight();
    for (let i = 0; i < 3; i++) {
      await page.setViewportSize({ width: vpSize.width, height: fullHeight });
      await page.waitForTimeout(400);
      const h = await contentHeight();
      if (h === fullHeight) break;
      fullHeight = h;
    }
    const shotBuffer = await page.screenshot({ path: `${dir}/${vp}.png` });
    const size = { width: vpSize.width, height: fullHeight };
    templateIndex = templateIndex.filter((t) => !(t.page === pageName && t.viewport === vp))
      .concat({ page: pageName, viewport: vp, path: path ?? '', width: size.width, height: Math.ceil(size.height), dpr: viewports[vp].deviceScaleFactor ?? 1 });

    const parts = await page.evaluate(() => {
      const attrs = (el) => [...el.attributes].map((a) => `${a.name}="${a.value.replace(/"/g, '&quot;')}"`).join(' ');
      return {
        title: document.title.replace(/</g, '&lt;'),
        htmlAttrs: attrs(document.documentElement),
        bodyAttrs: attrs(document.body),
        styles: [...document.head.querySelectorAll('style, link[rel="stylesheet"]')].map((s) => s.outerHTML).join('\n'),
        // The same CSS as one stylesheet, for the component files to share.
        css: [...document.head.querySelectorAll('style')].map((s) => (s.media ? `@media ${s.media} {\n${s.textContent}\n}` : s.textContent)).join('\n'),
        links: [...document.head.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.outerHTML).join('\n'),
        body: document.body.innerHTML,
      };
    });
    const fonts = `<style data-from="local-fonts">\n${await fontOverrides(page)}\n</style>`;
    const head = `${parts.styles}\n${fonts}`;
    await writeFile(`${dir}/${vp}.html`, docShell({ ...parts, head, body: parts.body }));

    // Components link one shared stylesheet per page and viewport instead of repeating ~0.5 MB of CSS.
    const cssFile = `${pageName}-${vp}.css`;
    if (Object.keys(components[pageName] ?? {}).length) {
      await mkdir('components/_css', { recursive: true });
      await writeFile(`components/_css/${cssFile}`, `/* olx.com.pk ${pageName} (${vp}) CSS, captured by scripts/snapshot-live.mjs */\n${parts.css}\n${await fontOverrides(page)}\n`);
    }
    const componentHead = `${parts.links}\n<link rel="stylesheet" href="../_css/${cssFile}">`;

    // Components: markup + the same CSS, wrapped in its ancestors' classes so
    // descendant selectors and inherited custom properties still apply.
    const found = [];
    for (const [name, def] of Object.entries(components[pageName] ?? {})) {
      const [find, vps] = Array.isArray(def) ? def : [def, null];
      if (vps && !vps.includes(vp)) continue;
      const handle = await page.evaluateHandle((src) => {
        const $ = (s) => document.querySelector(s);
        const byLabel = (l) => document.querySelector(`[aria-label="${l}"]`);
        const up = (el, n) => { for (let i = 0; i < n && el; i++) el = el.parentElement; return el; };
        const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const deepest = (test) => {
          let best = null;
          for (const el of document.body.querySelectorAll('*')) if (visible(el) && test(el) && (!best || best.contains(el))) best = el;
          return best;
        };
        const around = (...texts) => deepest((el) => texts.every((x) => el.textContent.includes(x)));
        const fullWidth = (el, h = 0) => {
          for (let e = el; e && e !== document.body; e = e.parentElement) {
            const r = e.getBoundingClientRect();
            if (r.width >= innerWidth - 1 && r.height >= h) return e;
          }
          return null;
        };
        return new Function('$', 'byLabel', 'up', 'around', 'deepest', 'fullWidth', `return (${src}) ?? null;`)($, byLabel, up, around, deepest, fullWidth);
      }, find);
      const el = handle.asElement();
      if (!el || !(await el.isVisible().catch(() => false))) { console.error(`  missing ${pageName}/${vp}/${name}`); continue; }

      // Position on the full page in whole pixels. The book crops the template with
      // it, and the screenshot below is cut from the page screenshot with it, so both
      // show exactly the same region.
      const rect = await el.evaluate((node) => {
        const r = node.getBoundingClientRect();
        const x = Math.floor(r.left + scrollX), y = Math.floor(r.top + scrollY);
        return { x, y, width: Math.ceil(r.right + scrollX) - x, height: Math.ceil(r.bottom + scrollY) - y };
      });
      const cdir = `components/${name}`;
      await mkdir(cdir, { recursive: true });
      await writeFile(`${cdir}/${vp}.png`, cropPng(shotBuffer, rect, viewports[vp].deviceScaleFactor ?? 1));
      const info = await el.evaluate((node) => {
        const r = node.getBoundingClientRect();
        const chain = [];
        for (let a = node.parentElement; a && a !== document.body; a = a.parentElement) {
          chain.unshift({ tag: a.tagName.toLowerCase(), cls: a.getAttribute('class') ?? '', style: a.getAttribute('style') ?? '' });
        }
        return { width: Math.round(r.width), height: Math.round(r.height), chain, html: node.outerHTML };
      });
      // Ancestors keep their classes (for selectors and variables) but not their layout.
      const reset = 'display:block;position:static;width:auto;height:auto;min-height:0;max-width:none;margin:0;padding:0;border:0;transform:none;overflow:visible;box-shadow:none;';
      const open = info.chain.map((a) => `<div class="${a.cls}" style="${a.style ? a.style.replace(/"/g, '&quot;') + ';' : ''}${reset}">`).join('');
      const close = '</div>'.repeat(info.chain.length);
      const body = `<div style="width:${info.width}px">${open}${info.html}${close}</div>`;
      await writeFile(`${cdir}/${vp}.html`, docShell({
        title: `${name} (${vp}) – OLX live component`,
        htmlAttrs: parts.htmlAttrs, bodyAttrs: parts.bodyAttrs, head: componentHead, body,
      }));
      found.push({ name, page: pageName, viewport: vp, width: rect.width, height: rect.height, rect });
    }
    console.log(`captured ${pageName}/${vp} (${found.length} components)`);
    return found;
  } finally {
    await context.close();
  }
}

const only = process.argv[2];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
{
  const page = await browser.newPage();
  await page.goto(ORIGIN + '/', { waitUntil: 'load', timeout: 60_000 });
  pages['ad-detail'].path = await page.locator('a[href*="/item/"]').first().getAttribute('href');
  await page.close();
}
let index = [];
let templateIndex = [];
try { index = JSON.parse(await readFile('components/index.json', 'utf8')).components; } catch { /* first run */ }
try { templateIndex = JSON.parse(await readFile('templates/index.json', 'utf8')).templates; } catch { /* first run */ }
for (const [name, def] of Object.entries(pages)) {
  if (only && name !== only) continue;
  for (const vp of def.only ?? Object.keys(viewports)) {
    const found = await capture(browser, name, def, vp);
    index = index.filter((c) => !(c.page === name && c.viewport === vp)).concat(found);
  }
}
await browser.close();
index.sort((a, b) => a.name.localeCompare(b.name) || a.viewport.localeCompare(b.viewport));
const captured = new Date().toISOString().slice(0, 10);
await writeFile('components/index.json', JSON.stringify({ source: ORIGIN, captured, components: index }, null, 2) + '\n');
templateIndex.sort((a, b) => a.page.localeCompare(b.page) || a.viewport.localeCompare(b.viewport));
await writeFile('templates/index.json', JSON.stringify({ source: ORIGIN, captured, templates: templateIndex }, null, 2) + '\n');
