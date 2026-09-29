// Capture page templates (screenshot, HTML, key computed styles) from the live
// OLX site or a local maple instance.
//
//   npm i -D playwright   (or: npm run capture:live / capture:maple)
//   node scripts/capture.mjs live
//   MAPLE_URL=http://localhost:3000 node scripts/capture.mjs maple
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const source = process.argv[2] ?? 'live';
const base = source === 'maple'
  ? (process.env.MAPLE_URL ?? 'http://localhost:3000')
  : 'https://www.olx.com.pk';

// Extend with real paths (e.g. a specific ad) as templates get captured.
const templates = {
  home: '/',
  'search-results': '/items/q-iphone',
  'category-listing': '/mobile-phones_c1453',
};

const viewports = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

const browser = await chromium.launch();
for (const [name, path] of Object.entries(templates)) {
  for (const [vp, size] of Object.entries(viewports)) {
    const page = await browser.newPage({ viewport: size });
    await page.goto(base + path, { waitUntil: 'networkidle', timeout: 60_000 });
    const dir = `audit/${source}-snapshots/${name}/${vp}`;
    await mkdir(dir, { recursive: true });
    await page.screenshot({ path: `${dir}/page.png`, fullPage: true });
    await writeFile(`${dir}/page.html`, await page.content());
    const styles = await page.evaluate(() => {
      const pick = ['color', 'background-color', 'font-family', 'font-size', 'font-weight',
        'line-height', 'border-radius', 'box-shadow', 'padding', 'margin'];
      const out = {};
      for (const sel of ['body', 'header', 'button', 'input', 'a', 'h1', 'h2', 'footer']) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const cs = getComputedStyle(el);
        out[sel] = Object.fromEntries(pick.map((p) => [p, cs.getPropertyValue(p)]));
      }
      return out;
    });
    await writeFile(`${dir}/styles.json`, JSON.stringify(styles, null, 2));
    await page.close();
    console.log(`captured ${source}/${name}/${vp}`);
  }
}
await browser.close();
