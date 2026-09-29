// Capture logged-in OLX screens on your own machine. A browser window opens;
// you log in yourself (your password never leaves that window), then open each
// screen you want and name it here. Each one is saved into site/ like the public
// pages, for desktop and mobile, and appears in the prototype under "Logged in".
//
//   npm run capture:logged-in -- --redact "Your Name" --redact "Other Name"
//
// Phone numbers and email addresses are always redacted. --redact replaces any
// other text (your name, business name) with "Your name". Review the captures
// before committing: this repo may be public.
import { chromium } from 'playwright';
import { createInterface } from 'node:readline/promises';
import { readFile, writeFile } from 'node:fs/promises';
import { capture, ORIGIN, OUT, viewports } from './capture-site.mjs';

const args = process.argv.slice(2);
const redact = args.flatMap((a, i) => (a === '--redact' && args[i + 1] ? [args[i + 1]] : []));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROMIUM_PATH });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto(ORIGIN, { waitUntil: 'load' });

const rl = createInterface({ input: process.stdin, output: process.stdout });
console.log(`
1. Log in to OLX in the browser window that just opened.
2. Open a screen you want captured (My Ads, Chats, the Sell form, Account...).
3. Type a short name for it here (for example "my-ads") and press Enter.
   Type "q" when you're done.
`);

let index = { source: ORIGIN, pages: [] };
try { index = JSON.parse(await readFile(`${OUT}/index.json`, 'utf8')); } catch { /* first capture */ }
const capBrowser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

for (;;) {
  const name = (await rl.question('Screen name (or q): ')).trim();
  if (!name || name.toLowerCase() === 'q') break;
  const url = new URL(page.url());
  if (url.host !== new URL(ORIGIN).host) { console.log('  Open a page on olx.com.pk first.'); continue; }
  const id = `account-${slug(name)}`;
  const def = { id, title: name.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()) };
  const storageState = await context.storageState();
  for (const vp of Object.keys(viewports)) {
    try {
      await capture(capBrowser, def, url.pathname + url.search, vp, { storageState, redact });
      index.pages = index.pages.filter((p) => !(p.id === id && p.viewport === vp))
        .concat({ id, title: def.title, viewport: vp, path: url.pathname + url.search, overlay: false, flows: ['logged-in'] });
    } catch (err) {
      console.error(`  failed ${id}/${vp}: ${err.message.split('\n')[0]}`);
    }
  }
  await writeFile(`${OUT}/index.json`, JSON.stringify(index, null, 1) + '\n');
}

rl.close();
await capBrowser.close();
await browser.close();
console.log('\nDone. Run "npm run prototype" to rebuild the prototype, then review site/pages/account-* before committing.');
