// Capture logged-in OLX screens on your own machine, exactly as they appear.
// A browser window opens; you log in yourself (your password never leaves that
// window). Then either follow a guided checklist or capture any screen you like.
// Each capture takes a snapshot of the screen as it is (form steps, modals and
// upsell sheets included, nothing is reloaded) and saves it into site/ like the
// public pages, with sections and hotspots, under "Logged in" in the prototype.
//
//   npm run capture:logged-in                           # free mode: name screens as you go
//   npm run capture:logged-in -- --flow post-ad         # guided: posting an ad, step by step
//   npm run capture:logged-in -- --flow upsell          # guided: feature/boost packages and checkout
//   npm run capture:logged-in -- --flow account         # guided: my ads, favourites, chats, profile, settings
//   npm run capture:logged-in -- --flow all --device mobile --redact "Your Name"
//
// Phone numbers and email addresses are always redacted, and --redact hides any
// other text (your name, business name). Nothing is submitted or paid for by the
// script; stop before posting or paying if you don't want to. Review
// site/pages/account-* before committing: this repo may be public.
import { chromium } from 'playwright';
import { createInterface } from 'node:readline/promises';
import { readFile, writeFile } from 'node:fs/promises';
import { capture, ORIGIN, OUT, viewports } from './capture-site.mjs';

const FLOWS = {
  'post-ad': [
    ['post-category', 'Tap Sell. Show the category list.'],
    ['post-subcategory', 'Pick a category (for example Mobiles). Show its subcategories.'],
    ['post-details', 'Pick a subcategory. Show the ad details form (brand, condition, title, description).'],
    ['post-details-errors', 'Tap Next/Post with the form empty so the validation errors show.'],
    ['post-photos', 'Show the photo upload step (add a photo if you like).'],
    ['post-price', 'Show the price field.'],
    ['post-location', 'Show the location step (city and area pickers).'],
    ['post-contact', 'Show your name and phone number section (they will be redacted).'],
    ['post-review', 'Fill the form and show it just before posting. Stop here if you do not want to post.'],
    ['post-success', 'Only if you posted: the "Your ad is posted" / under review screen.'],
  ],
  upsell: [
    ['upsell-after-post', 'After posting (or from My Ads), show the "Sell faster" / feature your ad offer.'],
    ['upsell-packages', 'Show the list of packages (Featured, Boost to top, bundles) with prices.'],
    ['upsell-package-selected', 'Select a package so its summary shows.'],
    ['upsell-checkout', 'Continue to checkout: payment methods. Stop before paying.'],
    ['upsell-business-packages', 'If available: business / bulk packages page.'],
  ],
  account: [
    ['my-ads', 'Open My Ads.'],
    ['my-ads-menu', 'Open the menu on one of your ads (edit, deactivate, sell faster).'],
    ['favourites', 'Open your saved / favourite ads.'],
    ['chats', 'Open Chats (the inbox).'],
    ['chat-conversation', 'Open one conversation.'],
    ['profile', 'Open your public profile.'],
    ['edit-profile', 'Open Edit profile.'],
    ['settings', 'Open Settings (privacy, notifications, logout).'],
    ['notifications', 'Open notifications, if there is a page for them.'],
    ['account-menu-logged-in', 'Open the account menu (click your avatar / Account tab).'],
  ],
};

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i > -1 ? args[i + 1] : undefined; };
const redact = args.flatMap((a, i) => (a === '--redact' && args[i + 1] ? [args[i + 1]] : []));
const device = opt('--device') === 'mobile' ? 'mobile' : 'desktop';
const flowName = opt('--flow');
const steps = flowName === 'all' ? Object.values(FLOWS).flat() : flowName ? FLOWS[flowName] : null;
if (flowName && !steps) { console.error(`Unknown flow "${flowName}". Use one of: ${Object.keys(FLOWS).join(', ')}, all`); process.exit(1); }
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROMIUM_PATH });
const context = await browser.newContext(viewports[device]);
const page = await context.newPage();
await page.goto(ORIGIN, { waitUntil: 'load' });

// A copy of the screen as it is now: markup plus every stylesheet rule, including
// rules the app inserted at runtime (which are not in the HTML), without scripts.
async function snapshot() {
  return page.evaluate(() => {
    const clone = document.documentElement.cloneNode(true);
    const liveStyles = [...document.querySelectorAll('style')];
    [...clone.querySelectorAll('style')].forEach((s, i) => {
      const sheet = liveStyles[i]?.sheet;
      if (sheet && !s.textContent.trim()) {
        try { s.textContent = [...sheet.cssRules].map((r) => r.cssText).join('\n'); } catch { /* cross-origin */ }
      }
    });
    clone.querySelectorAll('script, noscript, iframe').forEach((e) => e.remove());
    // Keep what the user typed.
    const liveInputs = [...document.querySelectorAll('input, textarea, select')];
    [...clone.querySelectorAll('input, textarea, select')].forEach((e, i) => {
      const live = liveInputs[i];
      if (!live) return;
      if (e.tagName === 'TEXTAREA') e.textContent = live.value;
      else if (e.tagName === 'SELECT') [...e.options].forEach((o, j) => { if (live.options[j]?.selected) o.setAttribute('selected', ''); });
      else if (live.type === 'checkbox' || live.type === 'radio') { if (live.checked) e.setAttribute('checked', ''); }
      else e.setAttribute('value', live.value);
    });
    return { html: `<!doctype html>\n${clone.outerHTML}`, overlay: !!document.querySelector('[role="dialog"], [aria-modal="true"]') };
  });
}

let index = { source: ORIGIN, pages: [] };
try { index = JSON.parse(await readFile(`${OUT}/index.json`, 'utf8')); } catch { /* first capture */ }
const capBrowser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function captureNow(name, title) {
  const url = new URL(page.url());
  if (url.host !== new URL(ORIGIN).host) { console.log('  Open a page on olx.com.pk first.'); return; }
  const id = `account-${slug(name)}`;
  const { html, overlay } = await snapshot();
  const def = { id, title, overlay };
  try {
    await capture(capBrowser, def, url.pathname + url.search, device, { storageState: await context.storageState(), redact, html });
    index.pages = index.pages.filter((p) => !(p.id === id && p.viewport === device))
      .concat({ id, title, viewport: device, path: url.pathname + url.search, overlay, flows: ['logged-in', flowName].filter(Boolean) });
    await writeFile(`${OUT}/index.json`, JSON.stringify(index, null, 1) + '\n');
  } catch (err) {
    console.error(`  failed ${id}/${device}: ${err.message.split('\n')[0]}`);
  }
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
console.log(`\nLog in to OLX in the browser window (${device}). Then come back here.\n`);
await rl.question('Press Enter once you are logged in. ');

if (steps) {
  for (const [name, instruction] of steps) {
    const answer = (await rl.question(`\n${name}: ${instruction}\n  Enter = capture, s = skip, q = stop: `)).trim().toLowerCase();
    if (answer === 'q') break;
    if (answer === 's') continue;
    await captureNow(name, name.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()));
  }
} else {
  console.log('Open any screen, then type a short name for it (for example "my-ads"). Type q when done.');
  for (;;) {
    const name = (await rl.question('Screen name (or q): ')).trim();
    if (!name || name.toLowerCase() === 'q') break;
    await captureNow(name, name.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()));
  }
}

rl.close();
await capBrowser.close();
await browser.close();
console.log('\nDone. Run "npm run prototype" to rebuild the prototype, then review site/pages/account-* before committing.');
