// Import Motors pages from a design-kit build (the `local-build` branch:
// design-kit/templates/) into site/, as if they had been captured live.
//
//   git worktree add ../olx-local-build local-build   # or any checkout of it
//   node scripts/import-motors.mjs ../olx-local-build/design-kit/templates
//   node scripts/import-motors.mjs <templates> motors-compare motors-finance   # only these ids
//
// The kit's templates are the Motors server HTML with scripts stripped and
// their CSS, fonts and icons saved under _assets/. Each one is loaded at its
// live URL, with every asset the kit saved served from disk at its original
// CDN address, and goes through the same capture as the rest of site/
// (screenshot, sections, hotspots, redaction). The saved HTML therefore points
// at the real CDNs, like every other capture. Images the kit did not save
// (car photos, banners) are left out of the screenshots.
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { capture, ORIGIN, OUT, MOTORS } from './capture-site.mjs';

// Kit page name -> site page id ('home' is the Motors landing page).
const NAMES = {
  home: 'motors', 'new-cars': 'motors-new-cars', 'new-cars-listing': 'motors-all-new-cars', 'new-cars-listing-suv': 'motors-new-suvs',
  'new-cars-listing-empty': 'motors-new-cars-empty', 'new-cars-make-honda': 'motors-brand', 'new-cars-make-toyota': 'motors-brand-toyota',
  'new-cars-model-civic': 'motors-model', 'new-cars-model-corolla': 'motors-model-corolla', 'new-cars-variant': 'motors-version',
  compare: 'motors-compare', 'compare-details': 'motors-compare-result', 'car-reviews': 'motors-reviews',
  'car-reviews-corolla': 'motors-model-reviews', 'car-reviews-detail': 'motors-review', 'car-finance': 'motors-finance',
  'car-finance-bank': 'motors-finance-bank', 'car-inspection': 'motors-inspection', 'car-insurance': 'motors-insurance',
  'car-insurance-tpl': 'motors-insurance-tpl', 'car-insurance-partner': 'motors-insurer', 'auction-sheet': 'motors-auction-sheet',
  'car-tyres': 'motors-tyres', 'car-tyres-toyota': 'motors-brand-tyres', 'car-tyres-generation': 'motors-model-tyres',
  'car-batteries': 'motors-batteries', 'car-batteries-toyota': 'motors-brand-batteries', 'car-batteries-generation': 'motors-model-batteries',
  'oil-grades': 'motors-oil-grades',
};
// Scrolled states: sticky headers and tabs are CSS, so they work without the page's scripts.
const SCROLLED = [
  ['motors-scrolled', 'home', 'Motors, scrolled (sticky header)', 700],
  ['motors-model-scrolled', 'new-cars-model-civic', 'Honda Civic, scrolled (sticky section tabs)', 1400],
  ['motors-compare-result-scrolled', 'compare-details', 'Comparison, scrolled (sticky car header)', 1400],
];
const DEFS = Object.fromEntries([['motors', 'Motors', '/motors/'], ...MOTORS].map(([id, title, path]) => [id, { id, title, path, flows: ['motors'] }]));

for (const [id, , title, y] of SCROLLED) DEFS[id] = { id, title, path: '/motors/', scrolled: true, steps: { desktop: [{ scroll: y }], mobile: [{ scroll: y }] }, flows: ['motors'] };
for (const [id, name] of SCROLLED) DEFS[id].path = DEFS[NAMES[name]].path;
const [dir, ...only] = process.argv.slice(2);
if (!dir) { console.error('usage: node scripts/import-motors.mjs <design-kit/templates> [ids...]'); process.exit(1); }
const kit = JSON.parse(await readFile(join(dir, 'templates.json'), 'utf8'));
const assets = JSON.parse(await readFile(join(dir, '_assets/manifest.json'), 'utf8'));
const original = Object.fromEntries(Object.entries(assets).map(([url, file]) => [file, url]));
const saved = Object.fromEntries(Object.entries(assets).map(([url, file]) => [url, join(dir, '_assets', file)]));

// Every page in the kit, by its file, so rewritten links can point back at live URLs.
const livePath = {};
for (const [product, site] of Object.entries(kit.sites)) {
  for (const [name, p] of Object.entries(site.pages)) livePath[`${product}/${name}`] = p.path;
}
const unrewrite = (html) => html
  .replace(/(["'(])(?:\.\.\/\.\.\/)?_assets\/((?:css|fonts|icons)\/[\w.-]+)/g, (m, q, file) => (original[file] ? q + original[file] : m))
  .replace(/href="(?:\.\.\/\.\.\/(\w+)\/(?:desktop|mobile)\/)?([\w-]+)\.html([^"]*)"/g, (m, product, name, rest) => {
    const path = livePath[`${product ?? 'motors'}/${name}`];
    return path ? `href="${ORIGIN}${path}${rest}"` : m;
  });
// Saved stylesheets refer to their fonts and icons relatively (../fonts/x.woff2).
const unrewriteCss = (css) => css.replace(/url\((['"]?)\.\.\/((?:fonts|icons|css)\/[\w.-]+)\1\)/g, (m, q, file) => (original[file] ? `url(${q}${original[file]}${q})` : m));

// Serve saved assets at their CDN URLs; nothing else leaves the machine.
const route = async (r) => {
  const url = r.request().url().split('#')[0];
  const file = saved[url];
  if (!file) return r.abort();
  const body = await readFile(file);
  const type = /\.css$/.test(file) ? 'text/css' : /\.svg$/.test(file) ? 'image/svg+xml' : /\.woff2$/.test(file) ? 'font/woff2' : /\.woff$/.test(file) ? 'font/woff' : 'application/octet-stream';
  return r.fulfill({ body: type === 'text/css' ? unrewriteCss(body.toString()) : body, contentType: type, headers: { 'access-control-allow-origin': '*' } });
};

// The capture prefers fonts in fonts/ (git-ignored) by file name; put the saved Motors fonts there.
await mkdir('fonts', { recursive: true });
for (const [url, file] of Object.entries(saved)) {
  if (!/\.woff2?$/.test(url)) continue;
  const to = `fonts/${basename(new URL(url).pathname)}`;
  if (!(await access(to).then(() => true, () => false))) await copyFile(file, to);
}

await mkdir(`${OUT}/css`, { recursive: true });
const index = JSON.parse(await readFile(`${OUT}/index.json`, 'utf8'));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
let done = 0;
for (const [name, id] of [...Object.entries(NAMES), ...SCROLLED.map(([id, name]) => [name, id])]) {
  if (only.length && !only.includes(id)) continue;
  const def = DEFS[id];
  for (const vp of ['desktop', 'mobile']) {
    let html;
    try { html = await readFile(join(dir, `motors/${vp}/${name}.html`), 'utf8'); } catch { console.error(`skip ${id}/${vp}: no ${name}.html in the kit`); continue; }
    try {
      await capture(browser, def, def.path, vp, { html: unrewrite(html), route });
      const entry = { id, title: def.title, viewport: vp, path: def.path, overlay: !!def.scrolled, flows: def.flows };
      index.pages = index.pages.filter((p) => !(p.id === id && p.viewport === vp)).concat(entry);
      done++;
    } catch (err) {
      console.error(`failed ${id}/${vp}: ${err.message.split('\n')[0]}`);
    }
  }
}
await browser.close();
index.captured = new Date().toISOString().slice(0, 10);
await writeFile(`${OUT}/index.json`, JSON.stringify(index, null, 1) + '\n');
console.log(`imported ${done} Motors screens`);
