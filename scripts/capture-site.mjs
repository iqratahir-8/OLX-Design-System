// Capture olx.com.pk page by page and section by section, with every link and
// button position, so the pages can be browsed as a clickable prototype.
//
//   node scripts/capture-site.mjs                # everything not captured yet
//   node scripts/capture-site.mjs --force        # recapture everything
//   node scripts/capture-site.mjs home cat-jobs  # only these page ids
//
// Output (site/):
//   pages/<id>/<viewport>.html                 static page, OLX markup, CSS linked from site/css/
//   pages/<id>/<viewport>.png                  screenshot of the whole page (or the screen, for overlays)
//   pages/<id>/<viewport>.json                 sections, link/button hotspots, size, source URL
//   pages/<id>/sections/<viewport>/NN-name.png screenshot of each section
//   pages/<id>/sections/<viewport>/NN-name.html markup of each section
//   css/<hash>.css                             stylesheets, shared between pages
//   index.json                                 every capture, with its title, URL and flow tags
//
// Follows robots.txt: nothing under /post/, /chat/, /profile/ or /account is
// visited. Logged-in screens are captured separately, on your own machine, with
// scripts/capture-logged-in.mjs.
import { chromium, devices } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { freezePage, inlineStylesheets, fontOverrides, cropPng, docShell, scrollThrough, layoutFullHeight, pageParts } from './lib/capture-lib.mjs';

export const ORIGIN = 'https://www.olx.com.pk';
export const OUT = 'site';
const DISALLOWED = /^\/(post|chat|profile|payments|account|edit|nf)\b/;

export const viewports = {
  desktop: { viewport: { width: 1440, height: 900 } },
  // iPhone 13 profile at 2x keeps files smaller than 3x; the layout is identical.
  mobile: { ...devices['iPhone 13'], deviceScaleFactor: 2 },
};

// ---------------------------------------------------------------------------
// What to capture.
// A page has an id, a title, and either a path or a resolver that finds one.
// `steps` run after load (per viewport); `overlay: true` captures the screen as
// it looks with a modal or menu open, instead of the whole page.
const TOP = [
  ['mobiles', 'Mobiles', '/mobiles_c1411'],
  ['vehicles', 'Vehicles', '/vehicles_c5'],
  ['property-for-sale', 'Property for Sale', '/property-for-sale_c2'],
  ['property-for-rent', 'Property for Rent', '/property-for-rent_c3'],
  ['electronics', 'Electronics & Home Appliances', '/electronics-home-appliances_c99'],
  ['bikes', 'Bikes', '/bikes_c1898'],
  ['business', 'Business, Industrial & Agriculture', '/business-industrial-agriculture_c1981'],
  ['services', 'Services', '/services_c619'],
  ['jobs', 'Jobs', '/jobs_c4'],
  ['animals', 'Animals', '/animals_c103'],
  ['furniture', 'Furniture & Home Decor', '/furniture-home-decor_c628'],
  ['fashion', 'Fashion & Beauty', '/fashion-beauty_c87'],
  ['books-sports', 'Books, Sports & Hobbies', '/books-sports-hobbies_c767'],
  ['kids', 'Kids', '/kids_c88'],
];
// Subcategories whose filters or cards differ from their parent category.
const SUB = [
  ['mobile-phones', 'Mobile Phones', '/mobile-phones_c1453', 'mobiles'],
  ['cars', 'Cars', '/cars_c84', 'vehicles'],
  ['motorcycles', 'Motorcycles', '/motorcycles_c81', 'bikes'],
  ['houses', 'Houses for Sale', '/houses_c1721', 'property-for-sale'],
  ['flats-for-rent', 'Flats for Rent', '/apartments-flats_c1723', 'property-for-rent'],
  ['laptops', 'Laptops', '/laptops_c708203', 'electronics'],
  ['online-jobs', 'Online Jobs', '/online_c1737', 'jobs'],
];

// The first-visit location prompt only appears on some visits, so these steps are optional.
const MOBILE_HOME_STEPS = [{ click: 'text:Other address', optional: true }, { click: 'text:See all in Pakistan', optional: true }];
const home = (extra = {}) => ({ path: '/', steps: { mobile: [...MOBILE_HOME_STEPS, ...(extra.mobile ?? [])], desktop: extra.desktop ?? [] } });

const PAGES = [
  { id: 'home', title: 'Home', ...home(), flows: ['browse', 'search', 'sell', 'account', 'location'] },
  { id: 'location-prompt', title: 'Location prompt (first visit)', overlay: true, path: '/', only: ['mobile'], steps: { mobile: [{ expect: 'text:Other address' }] }, flows: ['first-visit'] },
  { id: 'location-select', title: 'Choose location (first visit)', overlay: true, path: '/', only: ['mobile'], steps: { mobile: [{ click: 'text:Other address' }] }, flows: ['first-visit'] },
  { id: 'motors', title: 'Motors', path: '/motors/', flows: ['motors'] },
  { id: 'property', title: 'Property', path: '/properties/', flows: ['property'] },
  ...TOP.map(([slug, title, path]) => ({ id: `cat-${slug}`, title, path, cat: slug, flows: ['browse'] })),
  ...SUB.map(([slug, title, path, cat]) => ({ id: `sub-${slug}`, title, path, cat, flows: ['browse'] })),
  ...TOP.map(([slug, title, path]) => ({ id: `ad-${slug}`, title: `Ad: ${title}`, resolve: { firstAd: path }, cat: slug, flows: ['browse'] })),
  ...SUB.filter(([s]) => ['cars', 'houses', 'online-jobs'].includes(s)).map(([slug, title, path, cat]) => ({ id: `ad-${slug}`, title: `Ad: ${title}`, resolve: { firstAd: path }, cat, flows: ['browse'] })),
  { id: 'search-results', title: 'Search results: iphone', path: '/items/q-iphone', flows: ['search'] },
  { id: 'search-empty', title: 'Search with no results', path: '/items/q-qzxqzxnothing', flows: ['search'] },
  { id: 'city', title: 'City: Lahore', resolve: { link: ['/mobile-phones_c1453', /^Lahore\b/] , strip: /\/mobile-phones_c1453$/ }, flows: ['location'] },
  { id: 'city-category', title: 'Mobile Phones in Lahore', resolve: { link: ['/mobile-phones_c1453', /^Lahore\b/] }, flows: ['location'] },
  { id: 'sitemap', title: 'Sitemap', path: '/sitemap/most-popular', flows: [] },

  // Motors vertical: every section, and one or two of its internal pages.
  { id: 'motors-new-cars', title: 'Motors: New Cars', path: '/motors/new-cars/', flows: ['motors'] },
  { id: 'motors-all-new-cars', title: 'Motors: All new cars', path: '/motors/new-cars/all-new-cars/', flows: ['motors'] },
  { id: 'motors-brand', title: 'Motors: New Honda cars', path: '/motors/new-cars/honda/', flows: ['motors'] },
  { id: 'motors-model', title: 'Motors: Honda Civic', path: '/motors/new-cars/honda/civic/', flows: ['motors'] },
  { id: 'motors-version', title: 'Motors: Honda Civic Oriel', path: '/motors/new-cars/honda/civic/oriel/', flows: ['motors'] },
  { id: 'motors-compare', title: 'Motors: Car comparison', path: '/motors/new-cars/compare/', flows: ['motors'] },
  { id: 'motors-compare-result', title: 'Motors: Corolla vs Civic', path: '/motors/new-cars/compare/toyota-corolla-vs-honda-civic/', flows: ['motors'] },
  { id: 'motors-finance', title: 'Motors: Car finance', path: '/motors/car-finance/', flows: ['motors'] },
  { id: 'motors-inspection', title: 'Motors: Car inspection', path: '/motors/car-inspection/', flows: ['motors'] },
  { id: 'motors-insurance', title: 'Motors: Car insurance', path: '/motors/car-insurance/', flows: ['motors'] },
  { id: 'motors-insurance-packages', title: 'Motors: Insurance packages', path: '/motors/car-insurance/packages/', flows: ['motors'] },
  { id: 'motors-insurer', title: 'Motors: IGI Insurance', path: '/motors/car-insurance/igi-insurance/', flows: ['motors'] },
  { id: 'motors-auction-sheet', title: 'Motors: Auction sheet verification', path: '/motors/auction-sheet-verification/', flows: ['motors'] },
  { id: 'motors-reviews', title: 'Motors: Car reviews', path: '/motors/car-reviews/', flows: ['motors'] },
  { id: 'motors-model-reviews', title: 'Motors: Honda Civic reviews', path: '/motors/car-reviews/honda/civic/', flows: ['motors'] },
  { id: 'motors-tyres', title: 'Motors: Car tyres', path: '/motors/car-tyres/', flows: ['motors'] },
  { id: 'motors-model-tyres', title: 'Motors: Honda Civic tyres', path: '/motors/car-tyres/honda/civic/2022-2026/', flows: ['motors'] },
  { id: 'motors-batteries', title: 'Motors: Car batteries', path: '/motors/car-batteries/', flows: ['motors'] },
  { id: 'motors-model-batteries', title: 'Motors: Honda Civic batteries', path: '/motors/car-batteries/honda/civic/2022-2026/', flows: ['motors'] },

  // Property: every property type, city pages, a plot ad, and the not-found page
  // that several links on the Property landing page lead to.
  { id: 'prop-flats-sale', title: 'Property: Flats for sale', path: '/apartments-flats_c1725', cat: 'property-for-sale', flows: ['property'] },
  { id: 'prop-houses-rent', title: 'Property: Houses for rent', path: '/houses_c1719', cat: 'property-for-rent', flows: ['property'] },
  { id: 'prop-plots', title: 'Property: Land & plots', path: '/land-plots_c40', cat: 'property-for-sale', flows: ['property'] },
  { id: 'prop-residential-plots', title: 'Property: Residential plots', path: '/residential-plots-land-plots_c40', cat: 'property-for-sale', flows: ['property'] },
  { id: 'prop-portions', title: 'Property: Portions & floors', path: '/portions-floors_c41', cat: 'property-for-sale', flows: ['property'] },
  { id: 'prop-rooms', title: 'Property: Rooms', path: '/rooms_c2048', cat: 'property-for-rent', flows: ['property'] },
  { id: 'prop-shops', title: 'Property: Shops & offices', path: '/shops-offices-commercial-space_c1733', cat: 'property-for-sale', flows: ['property'] },
  { id: 'prop-city-houses', title: 'Property: Houses for sale in Lahore', path: '/lahore_g4060673/houses_c1721', cat: 'property-for-sale', flows: ['property'] },
  { id: 'prop-city-plots', title: 'Property: Plots in Lahore', path: '/lahore_g4060673/land-plots_c40', cat: 'property-for-sale', flows: ['property'] },
  { id: 'ad-plots', title: 'Ad: Plot', resolve: { firstAd: '/land-plots_c40' }, cat: 'property-for-sale', flows: ['property'] },
  { id: 'page-not-found', title: 'Page not found', path: '/properties/houses_c1721/', flows: [] },

  // Scrolled states: headers change as you scroll (the mobile home header
  // compacts; ads show a sticky header with the price and section tabs).
  { id: 'home-scrolled', title: 'Home, scrolled (compact header)', scrolled: true, ...home({ desktop: [{ scroll: 700 }], mobile: [{ scroll: 700 }] }), flows: ['browse'] },
  { id: 'category-scrolled', title: 'Mobile Phones, scrolled', scrolled: true, path: '/mobile-phones_c1453', steps: { desktop: [{ scroll: 900 }], mobile: [{ scroll: 900 }] }, cat: 'mobiles', flows: ['browse'] },
  { id: 'ad-scrolled', title: 'Ad, scrolled (sticky ad header)', scrolled: true, resolve: { firstAd: '/mobile-phones_c1453' }, steps: { desktop: [{ scroll: 1000 }], mobile: [{ scroll: 1000 }] }, cat: 'mobiles', flows: ['browse'] },

  // Interaction states.
  { id: 'account-menu', title: 'Account (logged out)', ...home({ mobile: [{ click: 'text:Account' }] }), only: ['mobile'], flows: ['account'] },
  { id: 'login', title: 'Login options', overlay: true, ...home({ desktop: [{ click: 'label:Login' }], mobile: [{ click: 'text:Account' }, { click: 'text:Login or Sign up' }] }), flows: ['account', 'sell'] },
  { id: 'login-email', title: 'Login with email', overlay: true, ...home({ desktop: [{ click: 'label:Login' }, { click: 'text:Login with Email' }], mobile: [{ click: 'text:Account' }, { click: 'text:Login or Sign up' }, { click: 'text:Login with Email' }] }), flows: ['account'] },
  { id: 'login-phone', title: 'Login with phone', overlay: true, ...home({ desktop: [{ click: 'label:Login' }, { click: 'text:Login with Phone' }], mobile: [{ click: 'text:Account' }, { click: 'text:Login or Sign up' }, { click: 'text:Login with Phone' }] }), flows: ['account', 'sell'] },
  { id: 'signup', title: 'Create an account', overlay: true, ...home({ desktop: [{ click: 'label:Login' }, { click: 'css:button:has-text("Create an account")' }], mobile: [{ click: 'text:Account' }, { click: 'text:Login or Sign up' }, { click: 'css:button:has-text("Create an account")' }] }), flows: ['account'] },
  { id: 'categories-menu', title: 'All categories menu', overlay: true, path: '/', only: ['desktop'], steps: { desktop: [{ click: 'text:All categories' }] }, flows: ['browse'] },
  { id: 'location-menu', title: 'Location menu', overlay: true, path: '/', only: ['desktop'], steps: { desktop: [{ click: 'label:Location input' }] }, flows: ['location'] },
  { id: 'search-suggestions', title: 'Search suggestions', overlay: true, ...home({ desktop: [{ click: 'css:input[placeholder*="Find"]' }, { type: 'iph' }], mobile: [{ click: 'text:Search for' }, { type: 'iph' }] }), flows: ['search'] },
  { id: 'sort-menu', title: 'Sort menu', overlay: true, path: '/mobile-phones_c1453', only: ['desktop'], steps: { desktop: [{ click: 'text:Most relevant' }] }, flows: ['search'] },
  { id: 'sorted-low-price', title: 'Sorted by lowest price', path: '/mobile-phones_c1453', only: ['desktop'], steps: { desktop: [{ click: 'text:Most relevant' }, { click: 'text:Lowest price' }] }, flows: ['search'] },
  { id: 'filters-sheet', title: 'Filters', overlay: true, path: '/mobile-phones_c1453', only: ['mobile'], steps: { mobile: [{ tap: [37, 78] }] }, flows: ['search'] },
  { id: 'brand-sheet', title: 'Brand filter', overlay: true, path: '/mobile-phones_c1453', only: ['mobile'], steps: { mobile: [{ click: 'label:Make Quick Filter' }] }, flows: ['search'] },
  { id: 'price-sheet', title: 'Price filter', overlay: true, path: '/mobile-phones_c1453', only: ['mobile'], steps: { mobile: [{ click: 'label:Price Quick Filter', force: true }] }, flows: ['search'] },
];

// ---------------------------------------------------------------------------

const exists = (p) => access(p).then(() => true, () => false);
const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'section';

async function dismissNotice(page) {
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find((e) => /notifications are off/i.test(e.textContent));
    for (let e = h; e && e !== document.body; e = e.parentElement) {
      const pos = getComputedStyle(e).position;
      if (pos === 'fixed' || pos === 'absolute') { e.remove(); return; }
    }
  });
}

function locate(page, target) {
  const [kind, value] = [target.slice(0, target.indexOf(':')), target.slice(target.indexOf(':') + 1)];
  if (kind === 'label') return page.locator(`[aria-label="${value}"]`).first();
  if (kind === 'css') return page.locator(value).filter({ visible: true }).first();
  return page.getByText(value, { exact: true }).filter({ visible: true }).first();
}

async function runSteps(page, steps) {
  for (const step of steps) {
    if (step.expect) await locate(page, step.expect).waitFor({ timeout: 8_000 });
    if (step.click) {
      try {
        await locate(page, step.click).click({ timeout: step.optional ? 4_000 : 10_000, force: step.force });
      } catch (err) {
        if (step.optional) continue;
        throw err;
      }
    }
    if (step.scroll != null) {
      await page.evaluate(async (y) => {
        const inner = [...document.querySelectorAll('body *')].filter((e) => /auto|scroll/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 100)
          .sort((a, b) => b.clientHeight * b.clientWidth - a.clientHeight * a.clientWidth)[0];
        // Scroll in steps so scroll listeners (header compaction, sticky bars) fire.
        for (let at = 0; at <= y; at += 100) { window.scrollTo(0, at); inner?.scrollTo(0, at); await new Promise((r) => setTimeout(r, 60)); }
      }, step.scroll);
    }
    // The filter icon on mobile has no label or text, so it is tapped by position.
    if (step.tap) await page.mouse.click(...step.tap);
    if (step.type) await page.keyboard.type(step.type, { delay: 90 });
    await page.waitForTimeout(step.wait ?? 1800);
    await dismissNotice(page);
    if (DISALLOWED.test(new URL(page.url()).pathname)) throw new Error(`step led to a disallowed path: ${page.url()}`);
  }
}

// Resolve paths that depend on live content (ads expire, city links carry ids).
async function resolvePath(browser, def) {
  if (def.path) return def.path;
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    if (def.resolve.firstAd) {
      await page.goto(ORIGIN + def.resolve.firstAd, { waitUntil: 'load', timeout: 60_000 });
      await page.waitForTimeout(2500);
      const href = await page.locator('[aria-label="Listing"] a[href*="/item/"], a[href*="/item/"]').first().getAttribute('href');
      return new URL(href, ORIGIN).pathname;
    }
    if (def.resolve.link) {
      const [from, re] = def.resolve.link;
      await page.goto(ORIGIN + from, { waitUntil: 'load', timeout: 60_000 });
      await page.waitForTimeout(2500);
      const hrefs = await page.evaluate((src) => {
        const re = new RegExp(src);
        return [...document.querySelectorAll('a[href]')].filter((a) => re.test(a.textContent.trim())).map((a) => a.getAttribute('href'));
      }, re.source);
      let p = new URL(hrefs[0], ORIGIN).pathname;
      if (def.resolve.strip) p = p.replace(def.resolve.strip, '') || '/';
      return p;
    }
  } finally {
    await page.close();
  }
  throw new Error(`cannot resolve a path for ${def.id}`);
}

// Tag every link and button with where it pointed, before links are made inert.
function tagTargets() {
  let n = 0;
  for (const el of document.querySelectorAll('a[href], button, [role="button"], input[type="search"], input[placeholder], [aria-label="Listing"]')) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const link = el.tagName === 'A' ? el : el.matches('[aria-label="Listing"]') ? el.querySelector('a[href]') : null;
    const href = link ? new URL(link.getAttribute('href'), location.href).href : '';
    const label = (el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    el.setAttribute('data-cap', String(n++));
    el.setAttribute('data-cap-href', href);
    el.setAttribute('data-cap-label', label);
    el.setAttribute('data-cap-kind', el.matches('[aria-label="Listing"]') ? 'listing' : el.tagName === 'A' ? 'link' : el.tagName === 'INPUT' ? 'input' : 'button');
  }
}

// Measure hotspots and sections in the laid-out page, then remove the tags.
function measure({ overlay, scrolled }) {
  const vw = innerWidth;
  // Scrolled states are screenshots of the screen, so they use screen coordinates.
  const sx = scrolled ? 0 : scrollX, sy = scrolled ? 0 : scrollY;
  const round = (r) => {
    const x = Math.floor(r.left + sx), y = Math.floor(r.top + sy);
    return { x, y, width: Math.ceil(r.right + sx) - x, height: Math.ceil(r.bottom + sy) - y };
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
  };
  const selectorOf = (el) => {
    const parts = [];
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      parts.unshift(`:nth-child(${[...e.parentElement.children].indexOf(e) + 1})`);
    }
    return `body > ${parts.join(' > ')}`;
  };

  // Hotspots: tagged links and buttons that are visible; inner duplicates of an
  // outer link with the same target are dropped.
  const hotspots = [];
  for (const el of document.querySelectorAll('[data-cap]')) {
    if (!visible(el)) continue;
    const outer = el.parentElement?.closest('[data-cap]');
    if (outer && outer.getAttribute('data-cap-href') === el.getAttribute('data-cap-href') && outer.getAttribute('data-cap-kind') === 'link') continue;
    hotspots.push({ ...round(el.getBoundingClientRect()), kind: el.dataset.capKind, href: el.dataset.capHref || undefined, label: el.dataset.capLabel });
  }

  // Sections: walk down from <body>, splitting large blocks into their children
  // until each piece is a meaningful unit. Landmarks and cards stay whole.
  const kids = (el) => [...el.children].filter((c) => visible(c) && c.getBoundingClientRect().height >= 20);
  const sections = [];
  const maxH = overlay ? Infinity : Math.max(900, innerHeight * 0.25);
  // Landmarks and cards stay whole unless they wrap most of the page (OLX puts
  // the whole body inside a <header>).
  const atomic = (el) => el.matches('[role="dialog"]') || (el.getBoundingClientRect().height <= maxH && el.matches('header, footer, nav, form, [aria-label="Listing"], [aria-label="Category with hits section"], [aria-label="Breadcrumb"], [aria-label="Gallery"], [aria-label="Details"], [aria-label="Description"], [aria-label="Overview"], [aria-label="Seller description"], [aria-label="Related Ads"], [aria-label="Filters list"], table'));
  // A run of similar siblings (cards, rows) is one section, however tall.
  const isList = (el) => {
    const ks = kids(el);
    if (ks.length < 5) return false;
    const sig = (c) => `${c.tagName}.${c.className}`;
    const counts = {};
    ks.forEach((c) => { counts[sig(c)] = (counts[sig(c)] || 0) + 1; });
    if (Math.max(...Object.values(counts)) / ks.length < 0.7) return false;
    // Page sections that happen to repeat (the home page's category rows) stay separate.
    const avg = ks.reduce((h, c) => h + c.getBoundingClientRect().height, 0) / ks.length;
    return avg <= 480 && !ks.some((c) => c.matches('[aria-label="Category with hits section"]'));
  };
  const walk = (el, depth) => {
    const ks = kids(el);
    if (!ks.length || (depth > 0 && isList(el))) { sections.push(el); return; }
    if (ks.length === 1 && depth < 30) { walk(ks[0], depth + 1); return; }
    for (const k of ks) {
      const r = k.getBoundingClientRect();
      if (isList(k)) { sections.push(k); continue; }
      const tooBig = r.height > maxH && r.width >= vw * 0.5;
      if (tooBig && !atomic(k) && kids(k).length > 1 && depth < 30) walk(k, depth + 1);
      else if (tooBig && !atomic(k) && kids(k).length === 1 && depth < 30) walk(kids(k)[0], depth + 1);
      else sections.push(k);
    }
  };
  if (scrolled) {
    // The header as it looks after scrolling: the widest fixed or sticky bar at the top.
    const bars = [...document.querySelectorAll('body *')].filter((e) => {
      const r = e.getBoundingClientRect();
      return ['fixed', 'sticky'].includes(getComputedStyle(e).position) && visible(e) && r.top <= 2 && r.bottom > 20 && r.width >= vw * 0.8 && r.height >= 30 && r.height < innerHeight * 0.6;
    });
    const bar = bars.sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0];
    if (bar) { bar.setAttribute('data-cap-header', ''); sections.push(bar); }
  } else if (overlay) {
    // The overlay is whatever became visible because of the interaction: the
    // outermost newly visible element with a real size. Fall back to the
    // top-most positioned layer.
    const fresh = [...document.querySelectorAll('body *')].filter((e) => !e.hasAttribute('data-cap-pre') && visible(e)
      && e.getBoundingClientRect().width >= 120 && e.getBoundingClientRect().height >= 40
      && !(e.parentElement && !e.parentElement.hasAttribute('data-cap-pre') && e.parentElement !== document.body && visible(e.parentElement)));
    const area = (e) => { const r = e.getBoundingClientRect(); return r.width * r.height; };
    const appeared = fresh.sort((a, b) => area(b) - area(a))[0];
    const layers = [...document.querySelectorAll('body *')].filter((e) => {
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      return ['fixed', 'absolute'].includes(cs.position) && visible(e) && r.width >= 160 && r.height >= 80 && Number(cs.zIndex) > 0 && !e.closest('header');
    });
    const top = appeared ?? layers.sort((a, b) => Number(getComputedStyle(b).zIndex) - Number(getComputedStyle(a).zIndex) || (b.compareDocumentPosition(a) & 2 ? -1 : 1))[0];
    if (top) {
      // Prefer the panel inside a full-screen backdrop.
      let panel = top;
      const r = top.getBoundingClientRect();
      if (r.width >= vw - 1 && r.height >= innerHeight - 1) {
        panel = [...top.querySelectorAll('*')].find((e) => { const q = e.getBoundingClientRect(); return visible(e) && q.width >= 160 && q.height >= 80 && q.width < vw - 1; }) ?? top;
      }
      sections.push(panel);
    }
  } else {
    walk(document.body, 0);
  }

  const GENERIC = /^(presentation|Listing|Category with hits section|Wallpaper Ad Body|Package banner)$/;
  const name = (el) => {
    const label = el.getAttribute('aria-label');
    if (label && !GENERIC.test(label)) return label;
    if (el.querySelector('[aria-label="Listing"]') && isList(el)) return 'Listings';
    if (el.hasAttribute('data-cap-header')) return 'Header (scrolled)';
    if (el.matches('footer')) return 'Footer';
    { const r = el.getBoundingClientRect(); const pos = getComputedStyle(el).position;
      if (r.top + sy <= 2 && r.width >= vw * 0.8 && r.height < 260 && (pos === 'sticky' || pos === 'fixed' || el.matches('header'))) return 'Header'; }
    if (el.matches('header') && el.getBoundingClientRect().height <= maxH) return 'Header';
    const h = el.querySelector('h1, h2, h3');
    if (h && h.textContent.trim()) return h.textContent.trim().slice(0, 40);
    const lines = (el.innerText || '').split('\n').map((t) => t.trim()).filter(Boolean);
    return lines.length ? lines.slice(0, 3).join(' · ').slice(0, 48) : (el.querySelector('img[alt]')?.alt || el.tagName.toLowerCase());
  };
  const seen = new Set();
  const out = [];
  for (const el of sections) {
    if (seen.has(el)) continue;
    seen.add(el);
    let r = round(el.getBoundingClientRect());
    if (overlay || scrolled) {
      // The screenshot is the screen only: clip to it.
      const x = Math.max(0, r.x), y = Math.max(0, r.y);
      r = { x, y, width: Math.min(r.x + r.width, vw) - x, height: Math.min(r.y + r.height, innerHeight) - y };
    }
    if (r.width < 40 || r.height < 20) continue;
    out.push({ name: name(el), rect: r, selector: selectorOf(el), html: el.outerHTML });
  }
  out.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);

  document.querySelectorAll('[data-cap-pre], [data-cap-header]').forEach((el) => { el.removeAttribute('data-cap-pre'); el.removeAttribute('data-cap-header'); });
  document.querySelectorAll('[data-cap]').forEach((el) => {
    ['data-cap', 'data-cap-href', 'data-cap-label', 'data-cap-kind'].forEach((a) => el.removeAttribute(a));
  });
  for (const s of out) s.html = s.html.replace(/ data-cap(-href|-label|-kind|-pre|-header)?="[^"]*"/g, '');
  return { hotspots, sections: out.slice(0, 40) };
}

// Write each <style> block once under site/css/<hash>.css and link it.
async function writeCss(blocks) {
  const links = [];
  for (const css of blocks) {
    if (!css.trim()) continue;
    const hash = createHash('sha1').update(css).digest('hex').slice(0, 12);
    const file = `${OUT}/css/${hash}.css`;
    if (!(await exists(file))) await writeFile(file, css);
    links.push(hash);
  }
  return links;
}

// Options for the logged-in script: `storageState` (its session), `redact`
// (extra text to hide), and `html` (a snapshot of a screen as the user sees it,
// served at the page's own URL so relative links, CSS and images resolve).
export async function capture(browser, def, path, vp, contextOptions = {}) {
  const { redact, html, ...contextOpts } = contextOptions;
  const context = await browser.newContext({ ...viewports[vp], ...contextOpts });
  const page = await context.newPage();
  const dir = `${OUT}/pages/${def.id}`;
  const dpr = viewports[vp].deviceScaleFactor ?? 1;
  try {
    if (html) {
      await page.route(ORIGIN + path, (route) => (route.request().resourceType() === 'document'
        ? route.fulfill({ body: html, contentType: 'text/html; charset=utf-8' }) : route.continue()));
    }
    await page.goto(ORIGIN + path, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForTimeout(html ? 1500 : 3000);
    await dismissNotice(page);
    if (!def.overlay && !html) await scrollThrough(page);
    if (def.overlay) {
      await page.evaluate(() => document.querySelectorAll('body *').forEach((e) => {
        const r = e.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) e.setAttribute('data-cap-pre', '');
      }));
    }
    await runSteps(page, def.steps?.[vp] ?? []);
    await page.waitForTimeout(800);
    await page.evaluate(tagTargets);
    await inlineStylesheets(page);
    await page.evaluate(freezePage, ORIGIN);
    if (redact?.length) {
      await page.evaluate((words) => {
        const re = new RegExp(words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const hit = new RegExp(re.source, 'i'); // non-global: .test() keeps no state
        for (let n; (n = walker.nextNode());) if (hit.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(re, 'Your name');
        for (const el of document.body.querySelectorAll('*')) for (const a of [...el.attributes]) if (hit.test(a.value)) el.setAttribute(a.name, a.value.replace(re, 'Your name'));
      }, redact);
    }
    await page.waitForTimeout(300);

    // Pages are laid out at full height; overlays keep the screen size so the
    // modal or menu stays where the user sees it.
    const onScreen = def.overlay || def.scrolled;
    const size = onScreen ? page.viewportSize() : await layoutFullHeight(page);
    const { hotspots, sections } = await page.evaluate(measure, { overlay: !!def.overlay, scrolled: !!def.scrolled });
    const shot = await page.screenshot();

    await mkdir(`${dir}/sections/${vp}`, { recursive: true });
    await writeFile(`${dir}/${vp}.png`, shot);
    const parts = await pageParts(page);
    const cssHashes = await writeCss(parts.styleBlocks);
    const fonts = `<style data-from="local-fonts">\n${await fontOverrides(page, '../../../fonts')}\n</style>`;
    const cssLinks = (prefix) => cssHashes.map((h) => `<link rel="stylesheet" href="${prefix}css/${h}.css">`).join('\n');
    await writeFile(`${dir}/${vp}.html`, docShell({ ...parts, head: `${parts.links}\n${cssLinks('../../')}\n${fonts}`, body: parts.body }));

    const sectionMeta = [];
    for (const [i, s] of sections.entries()) {
      const file = `${String(i + 1).padStart(2, '0')}-${slugify(s.name)}`;
      await writeFile(`${dir}/sections/${vp}/${file}.png`, cropPng(shot, s.rect, dpr));
      const body = `<div style="width:${s.rect.width}px">${s.html}</div>`;
      await writeFile(`${dir}/sections/${vp}/${file}.html`, docShell({
        title: `${def.title}: ${s.name} (${vp})`, htmlAttrs: parts.htmlAttrs, bodyAttrs: parts.bodyAttrs,
        head: `${parts.links}\n${cssLinks('../../../../')}\n${fonts.replace(/\.\.\/\.\.\/\.\.\/fonts/g, '../../../../../fonts')}`, body,
      }));
      sectionMeta.push({ file, name: s.name, rect: s.rect, selector: s.selector });
    }
    const meta = {
      id: def.id, title: def.title, viewport: vp, url: ORIGIN + path, finalUrl: page.url(),
      width: size.width, height: size.height, dpr, overlay: !!def.overlay, scrolled: !!def.scrolled,
      captured: new Date().toISOString(), sections: sectionMeta, hotspots,
    };
    await writeFile(`${dir}/${vp}.json`, JSON.stringify(meta, null, 1) + '\n');
    console.log(`captured ${def.id}/${vp}: ${sectionMeta.length} sections, ${hotspots.length} hotspots`);
    return meta;
  } finally {
    await context.close();
  }
}

// ---------------------------------------------------------------------------
// Run the crawl only when this file is started directly (the logged-in script imports it).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const only = args.filter((a) => !a.startsWith('--'));
  await mkdir(`${OUT}/css`, { recursive: true });

  let index = { source: ORIGIN, pages: [] };
  try { index = JSON.parse(await readFile(`${OUT}/index.json`, 'utf8')); } catch { /* first run */ }

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  for (const def of PAGES) {
    if (only.length && !only.includes(def.id)) continue;
    for (const vp of def.only ?? Object.keys(viewports)) {
      if (!force && (await exists(`${OUT}/pages/${def.id}/${vp}.json`))) continue;
      try {
        const path = await resolvePath(browser, def);
        if (DISALLOWED.test(path)) throw new Error(`disallowed by robots.txt: ${path}`);
        await capture(browser, def, path, vp);
        const entry = { id: def.id, title: def.title, viewport: vp, path, cat: def.cat, overlay: !!def.overlay || !!def.scrolled, flows: def.flows ?? [] };
        index.pages = index.pages.filter((p) => !(p.id === def.id && p.viewport === vp)).concat(entry);
        index.captured = new Date().toISOString().slice(0, 10);
        await writeFile(`${OUT}/index.json`, JSON.stringify(index, null, 1) + '\n');
      } catch (err) {
        console.error(`failed ${def.id}/${vp}: ${err.message.split('\n')[0]}`);
      }
    }
  }
  await browser.close();
}
