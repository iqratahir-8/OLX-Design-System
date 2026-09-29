// Capture page templates (screenshot, HTML, key computed styles) from the live
// OLX site or a local maple instance.
//
//   npm i -D playwright   (or: npm run capture:live / capture:maple)
//   node scripts/capture.mjs live
//   MAPLE_URL=http://localhost:3000 node scripts/capture.mjs maple
import { chromium, devices } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

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

// Mobile uses a real device profile (UA + touch) so the site serves its mobile layout.
const viewports = {
  desktop: { viewport: { width: 1440, height: 900 } },
  mobile: devices['iPhone 13'],
};

// Remove OLX's "Your notifications are off" tooltip, which has no labelled close
// button: walk up from its heading to the positioned container and drop it.
async function dismissPopups(page) {
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find((el) => /notifications are off/i.test(el.textContent));
    let el = h;
    while (el && el !== document.body) {
      const pos = getComputedStyle(el).position;
      if (pos === 'fixed' || pos === 'absolute') { el.remove(); return; }
      el = el.parentElement;
    }
  });
}

// Drop inline scripts before saving: the page embeds app state (including search
// service credentials) that must not be committed, and it is not needed for design work.
const stripScripts = (html) => html.replace(/<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi, '');

// CHROMIUM_PATH lets you use an already-installed browser instead of `npx playwright install`.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const [name, path] of Object.entries(templates)) {
  for (const [vp, size] of Object.entries(viewports)) {
    const context = await browser.newContext(size);
    const page = await context.newPage();
    try {
    // 'networkidle' rarely settles on ad-heavy pages; wait for load, then let lazy content render.
    await page.goto(base + path, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForTimeout(3000);
    // Scroll through the page so lazy-loaded listing images render, then return to the top.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 250));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1500);
    await dismissPopups(page);
    const dir = `audit/${source}-snapshots/${name}/${vp}`;
    await mkdir(dir, { recursive: true });
    await page.screenshot({ path: `${dir}/page.png`, fullPage: true });
    await writeFile(`${dir}/page.html.gz`, gzipSync(stripScripts(await page.content())));
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
    console.log(`captured ${source}/${name}/${vp}`);
    } catch (err) {
      console.error(`failed ${source}/${name}/${vp}: ${err.message.split('\n')[0]}`);
    } finally {
      await context.close();
    }
  }
}
await browser.close();
