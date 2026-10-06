// Pulls server-rendered HTML for OLX Motors pages (GET only, nothing is submitted).
// Usage: node scripts/pull-motors-html.mjs [--only=substring]
// Output: motors-html/{desktop,mobile}/<page>.html and motors-html/manifest.json
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'motors-html');
const ORIGIN = 'https://www.olx.com.pk';
const UA = {
  desktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
};
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);

// name -> path (under /motors). Dynamic slugs not in this list are discovered from fetched pages below.
const pages = {
  home: '/motors/',
  'new-cars': '/motors/new-cars/',
  'new-cars-listing': '/motors/new-cars/all-new-cars/?body_type=sedan',
  'new-cars-listing-suv': '/motors/new-cars/all-new-cars/?body_type=suv',
  'new-cars-listing-empty': '/motors/new-cars/all-new-cars/?body_type=truck&make=honda&price_range=100000-200000',
  'new-cars-make-toyota': '/motors/new-cars/toyota/',
  'new-cars-make-honda': '/motors/new-cars/honda/',
  'new-cars-model-corolla': '/motors/new-cars/toyota/corolla/',
  'new-cars-model-civic': '/motors/new-cars/honda/civic/',
  compare: '/motors/new-cars/compare/',
  'car-reviews': '/motors/car-reviews/',
  'car-reviews-corolla': '/motors/car-reviews/toyota/corolla/',
  'car-inspection': '/motors/car-inspection/',
  'auction-sheet': '/motors/auction-sheet-verification/',
  'car-finance': '/motors/car-finance/',
  'car-insurance': '/motors/car-insurance/',
  'car-insurance-tpl': '/motors/car-insurance/tpl-insurance/',
  'car-tyres': '/motors/car-tyres/',
  'car-tyres-toyota': '/motors/car-tyres/toyota/',
  'car-batteries': '/motors/car-batteries/',
  'car-batteries-toyota': '/motors/car-batteries/toyota/',
  'oil-grades': '/motors/oil-grades/',
  'bad-slug-probe': '/motors/new-cars/notacar/notamodel/', // redirects to /motors/new-cars/, recorded in manifest only
};

const manifest = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pull(name, path) {
  for (const device of ['desktop', 'mobile']) {
    const url = ORIGIN + path;
    let status = 0, finalUrl = url, html = '', error;
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA[device], 'accept-language': 'en-US,en;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
      status = res.status; finalUrl = res.url; html = await res.text();
    } catch (e) { error = String(e.message ?? e); }
    const redirected = finalUrl !== url;
    const file = `${device}/${name}.html`;
    // A redirect means the requested page is gated or invalid, so saving it would mislabel another page.
    if (html && status === 200 && !redirected) {
      mkdirSync(join(out, device), { recursive: true });
      writeFileSync(join(out, file), html);
    }
    manifest.push({ name, device, requested: path, final: finalUrl.replace(ORIGIN, ''), status, redirected, bytes: html.length, file: html && status === 200 && !redirected ? file : null, error });
    console.log(`${device.padEnd(7)} ${String(status).padEnd(3)} ${name}${redirected ? '  -> ' + finalUrl.replace(ORIGIN, '') : ''}`);
    await sleep(400);
  }
}

const read = (device, name) => { const f = join(out, device, `${name}.html`); return existsSync(f) ? readFileSync(f, 'utf8') : ''; };
const hrefs = (html, re) => [...new Set([...html.matchAll(/href="(\/motors\/[^"#]*)"/g)].map((m) => m[1]).filter((h) => re.test(h)))];

for (const [name, path] of Object.entries(pages)) if (!only || name.includes(only)) await pull(name, path);

// Discover dynamic slugs from the pages just saved.
const discover = {};
const model = read('desktop', 'new-cars-model-corolla');
discover['new-cars-variant'] = hrefs(model, /^\/motors\/new-cars\/toyota\/corolla\/[^/]+\/$/)[0];
discover['compare-details'] = hrefs(read('desktop', 'compare'), /^\/motors\/new-cars\/compare\/[^/]+-vs-[^/]+\//)[0];
const reviewId = read('desktop', 'car-reviews-corolla').match(/reviews\/toyota\/corolla\/(\d+)\?version=/)?.[1];
discover['car-reviews-detail'] = reviewId && `/motors/car-reviews/toyota/corolla/${reviewId}/`;
const fin = read('desktop', 'car-finance');
const bank = fin.match(/"slug":"([a-z0-9-]*bank[a-z0-9-]*)"/)?.[1]; // bank slugs only appear in the embedded page data
discover['car-finance-bank'] = bank && `/motors/car-finance/${bank}/`;
discover['car-insurance-partner'] = hrefs(read('desktop', 'car-insurance'), /^\/motors\/car-insurance\/(?!packages|banner)[^/]+\/$/)[0];
discover['car-tyres-generation'] = hrefs(read('desktop', 'car-tyres'), /^\/motors\/car-tyres\/[^/]+\/[^/]+\/[^/]+\/$/)[0];
discover['car-batteries-generation'] = hrefs(read('desktop', 'car-batteries'), /^\/motors\/car-batteries\/[^/]+\/[^/]+\/[^/]+\/$/)[0];
for (const [name, path] of Object.entries(discover)) {
  if (!path) { console.log(`skip    ---  ${name} (no link found on source page)`); manifest.push({ name, requested: null, note: 'no link found on source page' }); continue; }
  if (!only || name.includes(only)) await pull(name, path);
}

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'manifest.json'), JSON.stringify({ origin: ORIGIN, fetchedAt: new Date().toISOString(), pages: manifest }, null, 2));
console.log(`\nSaved ${manifest.filter((m) => m.file).length} files, manifest at motors-html/manifest.json`);
