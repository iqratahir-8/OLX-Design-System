// Measure the design-kit pages in storybook/design-kit/templates/ (Classifieds,
// Property and Motors, built on the Mac from server-rendered HTML) so the
// prototype and the book can use them like the pages captured here: full-page
// size, links and buttons (hotspots) and sections, per viewport. Writes
// site/kit.json; build-prototype.mjs merges it in.
//
//   node scripts/import-kit.mjs
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { viewports, tagTargets, measure } from './capture-site.mjs';
import { layoutFullHeight } from './lib/capture-lib.mjs';

const KIT = 'storybook/design-kit/templates';
const PORT = 8781;
const manifest = JSON.parse(await readFile(`${KIT}/templates.json`, 'utf8'));

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const body = await readFile(`.${path}`);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(PORT);
const base = `http://localhost:${PORT}/${KIT}/`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const pages = [];
for (const [site, s] of Object.entries(manifest.sites)) {
  for (const [name, p] of Object.entries(s.pages)) {
    for (const vp of p.devices) {
      const context = await browser.newContext(viewports[vp]);
      // Remote photos and fonts only change pixels, not layout; skip them.
      await context.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
      const page = await context.newPage();
      await page.goto(`${base}${site}/${vp}/${name}.html`, { waitUntil: 'load' });
      await page.waitForTimeout(300);
      const size = await layoutFullHeight(page);
      await page.evaluate(tagTargets);
      const m = await page.evaluate(measure, { overlay: false, scrolled: false });
      // Links to other kit pages become kit:<site>/<name>; the rest keep their live URL.
      const hotspots = m.hotspots.map((h) => {
        if (h.href?.startsWith(base)) {
          const rel = h.href.slice(base.length).split(/[?#]/)[0];
          const [hs, , file] = rel.split('/');
          return { ...h, href: file ? `kit:${hs}/${file.replace(/\.html$/, '')}` : undefined };
        }
        return h;
      });
      pages.push({
        id: `kit-${site}-${name}`, site, name, label: p.label, path: p.path, viewport: vp,
        html: `${KIT}/${site}/${vp}/${name}.html`, url: `${s.origin}${p.path}`,
        width: size.width, height: size.height, hotspots,
        sections: m.sections.map(({ name: n, rect, selector }) => ({ name: n, rect, selector })),
      });
      console.log(`${site}/${vp}/${name}: ${size.height}px, ${hotspots.length} hotspots, ${m.sections.length} sections`);
      await context.close();
    }
  }
}
await browser.close();
server.close();

const flows = Object.entries(manifest.sites).flatMap(([site, s]) => s.flows.map((f) => ({ site, name: f.name, steps: f.steps })));
const labels = Object.fromEntries(Object.entries(manifest.sites).map(([k, s]) => [k, s.label]));
await writeFile('site/kit.json', JSON.stringify({ source: KIT, sites: labels, pages, flows }, null, 1) + '\n');
console.log(`site/kit.json: ${pages.length} page captures, ${flows.length} flows`);
