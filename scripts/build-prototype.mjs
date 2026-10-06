// Build prototype/data.json from the captures in site/: every link and button
// on every captured page is pointed at the captured page (or state) a user
// would land on, and the main user journeys are listed as guided flows.
//
//   node scripts/build-prototype.mjs
import { readFile, writeFile } from 'node:fs/promises';

const SITE = 'site';
const index = JSON.parse(await readFile(`${SITE}/index.json`, 'utf8'));
const ORIGIN = new URL(index.source).host;

const TOP_PATHS = {
  '/mobiles_c1411': 'mobiles', '/vehicles_c5': 'vehicles', '/property-for-sale_c2': 'property-for-sale',
  '/property-for-rent_c3': 'property-for-rent', '/electronics-home-appliances_c99': 'electronics', '/bikes_c1898': 'bikes',
  '/business-industrial-agriculture_c1981': 'business', '/services_c619': 'services', '/jobs_c4': 'jobs', '/animals_c103': 'animals',
  '/furniture-home-decor_c628': 'furniture', '/fashion-beauty_c87': 'fashion', '/books-sports-hobbies_c767': 'books-sports', '/kids_c88': 'kids',
};

const meta = {};
for (const p of index.pages) {
  meta[`${p.id}~${p.viewport}`] = JSON.parse(await readFile(`${SITE}/pages/${p.id}/${p.viewport}.json`, 'utf8'));
}
const has = (id, vp) => Boolean(meta[`${id}~${vp}`]);
const norm = (path) => (path.length > 1 ? path.replace(/\/+$/, '') : path);
const byPath = {};
for (const p of index.pages) if (!p.overlay && !p.steps) byPath[`${norm(p.path)}~${p.viewport}`] ??= p.id;
byPath['/~desktop'] = 'home';
byPath['/~mobile'] = 'home';

// Which top-level category a subcategory belongs to, read from the order of the
// category links in the All categories menu (each top category, then its children).
const parentOf = {};
for (const key of ['categories-menu~desktop', 'home~desktop']) {
  let current = null;
  for (const h of meta[key]?.hotspots ?? []) {
    if (!h.href) continue;
    const u = new URL(h.href);
    if (u.host !== ORIGIN || !/_c\d+$/.test(norm(u.pathname))) continue;
    const path = norm(u.pathname);
    if (TOP_PATHS[path]) current = TOP_PATHS[path];
    else if (current) parentOf[path] ??= current;
  }
}

const catOfPage = Object.fromEntries(index.pages.map((p) => [p.id, p.cat]));
const firstAvailable = (vp, ...ids) => ids.find((id) => id && has(id, vp));

// Buttons and fields that open a state rather than a URL.
const ACTIONS = [
  [/^account$/i, (vp) => firstAvailable(vp, 'account-menu', 'login')],
  [/^(login|login or sign up|sell|\+ ?sell|my ads|chat|call|whatsapp|show phone number|favorite icon|save|login to chat)$/i, (vp) => firstAvailable(vp, 'login')],
  [/^login with email$/i, (vp) => firstAvailable(vp, 'login-email')],
  [/^login with phone$/i, (vp) => firstAvailable(vp, 'login-phone')],
  [/create an account/i, (vp) => firstAvailable(vp, 'signup')],
  [/^(search input|find cars, mobile phones and more.*|search for.*)$/i, (vp) => firstAvailable(vp, 'search-suggestions')],
  [/^search$/i, (vp) => firstAvailable(vp, 'search-results')],
  [/^(location input|pakistan|search city, area or locality)$/i, (vp) => firstAvailable(vp, vp === 'desktop' ? 'location-menu' : 'location-select')],
  [/^all categories$/i, (vp) => firstAvailable(vp, 'categories-menu')],
  [/^(most relevant|sort by:?)$/i, (vp) => firstAvailable(vp, 'sort-menu')],
  [/^lowest price$/i, (vp) => firstAvailable(vp, 'sorted-low-price')],
  [/make quick filter/i, (vp) => firstAvailable(vp, 'brand-sheet')],
  [/price quick filter/i, (vp) => firstAvailable(vp, 'price-sheet')],
  [/^other address$/i, (vp) => firstAvailable(vp, 'location-select')],
  [/^see all in pakistan$/i, (vp) => firstAvailable(vp, 'home')],
  [/^(back button|close|×|back)$/i, () => '@back'],
];

function resolve(h, source, vp) {
  if (h.href) {
    let u;
    try { u = new URL(h.href); } catch { return null; }
    if (u.host !== ORIGIN) return u.protocol.startsWith('http') ? { external: h.href } : null;
    const path = norm(u.pathname);
    if (u.hash && path === norm(new URL(meta[`${source}~${vp}`].url).pathname)) return null;
    if (byPath[`${path}~${vp}`]) return { to: byPath[`${path}~${vp}`] };
    if (path.startsWith('/item/')) return { to: firstAvailable(vp, catOfPage[source] && `ad-${catOfPage[source]}`, 'ad-mobiles') };
    if (path.startsWith('/items/')) return { to: firstAvailable(vp, 'search-results') };
    if (/_g\d+/.test(path)) return { to: firstAvailable(vp, /_c\d+/.test(path) ? 'city-category' : 'city', 'city') };
    if (/_c\d+$/.test(path)) {
      const top = TOP_PATHS[path] ?? parentOf[path];
      return { to: firstAvailable(vp, top && `cat-${top}`) };
    }
    if (/^\/motors/.test(path)) {
      // Motors pages not captured exactly go to the captured page of the same kind.
      const suv = u.searchParams.get('body_type') === 'suv';
      const kinds = [
        [/^\/motors\/new-cars\/compare\/.+/, 'motors-compare-result'], [/^\/motors\/new-cars\/compare/, 'motors-compare'],
        [/^\/motors\/new-cars\/all-new-cars/, suv ? 'motors-new-suvs' : 'motors-all-new-cars'],
        [/^\/motors\/new-cars\/[^/]+\/[^/]+\/[^/]+/, 'motors-version'],
        [/^\/motors\/new-cars\/toyota\/corolla/, 'motors-model-corolla'], [/^\/motors\/new-cars\/[^/]+\/[^/]+/, 'motors-model'],
        [/^\/motors\/new-cars\/toyota/, 'motors-brand-toyota'], [/^\/motors\/new-cars\/[^/]+/, 'motors-brand'], [/^\/motors\/new-cars/, 'motors-new-cars'],
        [/^\/motors\/car-reviews\/[^/]+\/[^/]+\/.+/, 'motors-review'], [/^\/motors\/car-reviews\/.+/, 'motors-model-reviews'], [/^\/motors\/car-reviews/, 'motors-reviews'],
        [/^\/motors\/car-tyres\/[^/]+\/.+/, 'motors-model-tyres'], [/^\/motors\/car-tyres\/.+/, 'motors-brand-tyres'], [/^\/motors\/car-tyres/, 'motors-tyres'],
        [/^\/motors\/car-batteries\/[^/]+\/.+/, 'motors-model-batteries'], [/^\/motors\/car-batteries\/.+/, 'motors-brand-batteries'], [/^\/motors\/car-batteries/, 'motors-batteries'],
        [/^\/motors\/car-insurance\/tpl/, 'motors-insurance-tpl'], [/^\/motors\/car-insurance\/.+/, 'motors-insurer'], [/^\/motors\/car-insurance/, 'motors-insurance'],
        [/^\/motors\/car-finance\/.+/, 'motors-finance-bank'], [/^\/motors\/car-finance/, 'motors-finance'],
        [/^\/motors\/car-inspection/, 'motors-inspection'], [/^\/motors\/auction-sheet/, 'motors-auction-sheet'], [/^\/motors\/oil-grades/, 'motors-oil-grades'],
      ];
      const hit = kinds.find(([re]) => re.test(path));
      return { to: firstAvailable(vp, hit?.[1], 'motors') };
    }
    if (/^\/propert/.test(path)) return { to: firstAvailable(vp, 'property') };
    if (/^\/(post|myads|chat|account|profile|favorites|myfavorites)/.test(path)) return { to: firstAvailable(vp, 'login') };
    return null;
  }
  const label = (h.label || '').trim();
  for (const [re, fn] of ACTIONS) if (re.test(label)) { const to = fn(vp); return to ? { to } : null; }
  return null;
}

const pages = {};
let linked = 0, total = 0;
for (const [key, m] of Object.entries(meta)) {
  const [id, vp] = key.split('~');
  const hotspots = [];
  for (const h of m.hotspots) {
    total++;
    const target = resolve(h, id, vp);
    if (!target || (!target.to && !target.external) || target.to === id) continue;
    linked++;
    hotspots.push({ x: h.x, y: h.y, w: h.width, h: h.height, label: h.label, ...target });
  }
  // Smaller hotspots first, so a button inside a card wins over the card.
  hotspots.sort((a, b) => a.w * a.h - b.w * b.h);
  pages[key] = {
    id, vp, title: m.title, url: m.url, width: m.width, height: m.height, overlay: m.overlay, scrolled: !!m.scrolled,
    image: `../${SITE}/pages/${id}/${vp}.png`, html: `../${SITE}/pages/${id}/${vp}.html`,
    // Empty blocks are OLX ad slots, which render blank without their scripts.
    sections: m.sections.map((s) => ({ name: /^(div|section|aside)$/.test(s.name) ? 'Ad space' : s.name, ...s.rect, image: `../${SITE}/pages/${id}/sections/${vp}/${s.file}.png`, html: `../${SITE}/pages/${id}/sections/${vp}/${s.file}.html` })),
    hotspots,
  };
}

// Guided flows: each step names the page and the control to use next.
const FLOWS = [
  { id: 'first-visit', title: 'First visit on mobile', steps: [
    ['location-prompt', 'OLX asks where you want to buy or sell.', 'Other address'],
    ['location-select', 'Pick a location, or browse all of Pakistan.', 'See all in Pakistan'],
    ['home', 'The home page, with categories and fresh listings.'],
  ] },
  { id: 'browse', title: 'Browse a category to an ad', steps: [
    ['home', 'Start on the home page and choose Mobiles.', 'Mobiles'],
    ['cat-mobiles', 'The Mobiles category with its filters.', 'Mobile Phones'],
    ['sub-mobile-phones', 'Mobile Phones in list view. Open an ad.'],
    ['ad-mobiles', 'The ad: photos, details and the seller.', 'Chat'],
    ['login', 'Contacting a seller asks you to log in.'],
  ] },
  { id: 'search', title: 'Search, sort and open a result', steps: [
    ['home', 'Tap the search field.', 'Search input'],
    ['search-suggestions', 'Suggestions appear as you type.'],
    ['search-results', 'Results for "iphone".'],
    ['sort-menu', 'Change the sort order.', 'Lowest price'],
    ['sorted-low-price', 'Sorted by lowest price.'],
    ['search-empty', 'A search with no results.'],
  ] },
  { id: 'search-mobile', title: 'Filter on mobile', steps: [
    ['sub-mobile-phones', 'Mobile Phones on a phone.', 'Make Quick Filter'],
    ['brand-sheet', 'Filter by brand.'],
    ['price-sheet', 'Filter by price.'],
    ['filters-sheet', 'All filters.'],
  ] },
  { id: 'sell', title: 'Start selling', steps: [
    ['home', 'Tap Sell.', 'Sell'],
    ['login', 'Posting an ad needs an account.', 'Login with Phone'],
    ['login-phone', 'Log in with a phone number.'],
  ] },
  { id: 'account', title: 'Log in or sign up', steps: [
    ['home', 'Tap Login (on mobile, the Account tab).', 'Login'],
    ['account-menu', 'On mobile, the Account tab asks you to sign in.', 'Login or Sign up'],
    ['login', 'Choose how to log in.', 'Login with Email'],
    ['login-email', 'Log in with email.'],
    ['signup', 'Or create an account.'],
  ] },
  { id: 'location', title: 'Browse by location', steps: [
    ['home', 'Open the location picker.', 'Location input'],
    ['location-menu', 'Choose a city.'],
    ['city', 'Everything in Lahore.'],
    ['city-category', 'Mobile Phones in Lahore.'],
  ] },
  { id: 'headers', title: 'Header states while scrolling', steps: [
    ['home', 'The header at the top of the home page.'],
    ['home-scrolled', 'After scrolling, the header stays on screen (compact on mobile).'],
    ['category-scrolled', 'On a listing page the header and filters stay on screen.'],
    ['ad-mobiles', 'An ad at the top: the gallery fills the screen.'],
    ['ad-scrolled', 'After scrolling an ad, a sticky header shows the price, contact buttons and section tabs.'],
  ] },
  { id: 'motors-research', title: 'Motors: research a new car', steps: [
    ['motors', 'The Motors landing page.', 'New Cars'],
    ['motors-new-cars', 'New cars by make, body type and budget. Open a popular car.', 'Toyota Corolla'],
    ['motors-model-corolla', 'The Corolla: prices, variants, specs, colours and reviews.', 'Altis CVT 1.6'],
    ['motors-version', 'One Corolla variant in detail.'],
  ] },
  { id: 'motors-browse-new', title: 'Motors: browse new cars', steps: [
    ['motors-new-cars', 'Browse every new car.', 'View More'],
    ['motors-all-new-cars', 'All new sedans, with filters.'],
    ['motors-new-suvs', 'All new SUVs.'],
    ['motors-new-cars-empty', 'Filters that match no cars.'],
    ['motors-brand-toyota', 'New Toyota cars.', 'Toyota Corolla'],
    ['motors-model-corolla', 'The Toyota Corolla.'],
    ['motors-brand', 'New Honda cars.', 'Honda Civic'],
    ['motors-model', 'The Honda Civic.'],
  ] },
  { id: 'motors-compare', title: 'Motors: compare two cars', steps: [
    ['motors-compare', 'Pick two cars, or open a popular comparison.', 'View Comparison'],
    ['motors-compare-result', 'Jaecoo J7 vs Kia Sportage, side by side.'],
  ] },
  { id: 'motors-reviews', title: 'Motors: read car reviews', steps: [
    ['motors-reviews', 'Owner reviews by make and model.', 'Toyota Corolla'],
    ['motors-model-reviews', 'Reviews of the Toyota Corolla.'],
    ['motors-review', 'One owner review in full.'],
  ] },
  { id: 'motors-finance', title: 'Motors: car finance', steps: [
    ['motors-finance', 'Calculate monthly instalments and compare banks.'],
    ['motors-finance-bank', 'One bank\'s car finance plans.'],
  ] },
  { id: 'motors-inspection', title: 'Motors: book a car inspection', steps: [
    ['motors-inspection', 'Book an OLX car inspection (the booking form is not submitted).'],
  ] },
  { id: 'motors-insurance', title: 'Motors: car insurance', steps: [
    ['motors-insurance', 'Compare car insurance and insurers.'],
    ['motors-insurer', 'One insurer in detail.'],
    ['motors-insurance-tpl', 'Third-party (TPL) insurance.'],
  ] },
  { id: 'motors-auction-sheet', title: 'Motors: verify an auction sheet', steps: [
    ['motors-auction-sheet', 'Verify a Japanese auction sheet by chassis number (nothing is submitted).'],
  ] },
  { id: 'motors-tyres', title: 'Motors: find tyres', steps: [
    ['motors-tyres', 'Find tyres for your car.', 'Seres 3'],
    ['motors-model-tyres', 'Tyre sizes for one car generation (Seres 3, 2023 to 2026).'],
    ['motors-brand-tyres', 'Tyres by make: Toyota.'],
  ] },
  { id: 'motors-batteries', title: 'Motors: find a battery or oil', steps: [
    ['motors-batteries', 'Find a battery for your car.', 'Honda Civic'],
    ['motors-model-batteries', 'Batteries for the Honda Civic (2022 to 2026).'],
    ['motors-brand-batteries', 'Batteries by make: Toyota.'],
    ['motors-oil-grades', 'Engine oil grades.'],
  ] },
  { id: 'motors-headers', title: 'Motors: header states while scrolling', steps: [
    ['motors', 'The Motors header at the top of the landing page.'],
    ['motors-scrolled', 'After scrolling, the header stays on screen.'],
    ['motors-model', 'On a car page (mobile: a back button and the car name).'],
    ['motors-model-scrolled', 'A car page after scrolling.'],
    ['motors-compare-result-scrolled', 'A comparison after scrolling.'],
  ] },
  { id: 'motors', title: 'Motors: find a used car', steps: [
    ['motors', 'The Motors landing page.'],
    ['sub-cars', 'Cars for sale, with car filters.'],
    ['ad-cars', 'A car ad with its specifications.'],
  ] },
  { id: 'property', title: 'Property: find a house', steps: [
    ['property', 'The Property landing page.'],
    ['sub-houses', 'Houses for sale.'],
    ['ad-houses', 'A house ad.'],
    ['sub-flats-for-rent', 'Flats for rent.'],
  ] },
  { id: 'property-plots', title: 'Property: find a plot in Lahore', steps: [
    ['property', 'The Property landing page.'],
    ['prop-plots', 'Land and plots across Pakistan.'],
    ['prop-residential-plots', 'Residential plots only.'],
    ['prop-city-plots', 'Plots in Lahore.'],
    ['ad-plots', 'A plot ad.'],
  ] },
  { id: 'property-types', title: 'Property: every property type', steps: [
    ['prop-flats-sale', 'Flats for sale.'],
    ['sub-houses', 'Houses for sale.'],
    ['prop-city-houses', 'Houses for sale in Lahore.'],
    ['prop-houses-rent', 'Houses for rent.'],
    ['prop-portions', 'Portions and floors.'],
    ['prop-rooms', 'Rooms.'],
    ['prop-shops', 'Shops, offices and commercial space.'],
    ['page-not-found', 'Some Property landing links lead to this not-found page.'],
  ] },
  // Logged-in flows appear once they are captured with scripts/capture-logged-in.mjs.
  { id: 'post-ad', title: 'Post an ad (logged in)', steps: [
    ['account-post-category', 'Choose a category.'], ['account-post-subcategory', 'Choose a subcategory.'],
    ['account-post-details', 'Fill in the ad details.'], ['account-post-details-errors', 'Validation errors.'],
    ['account-post-photos', 'Add photos.'], ['account-post-price', 'Set the price.'], ['account-post-location', 'Set the location.'],
    ['account-post-contact', 'Contact details.'], ['account-post-review', 'Review before posting.'], ['account-post-success', 'Ad posted.'],
  ] },
  { id: 'upsell', title: 'Sell faster: packages (logged in)', steps: [
    ['account-upsell-after-post', 'The offer to feature your ad.'], ['account-upsell-packages', 'Packages and prices.'],
    ['account-upsell-package-selected', 'A selected package.'], ['account-upsell-checkout', 'Checkout.'],
    ['account-upsell-business-packages', 'Business packages.'],
  ] },
  { id: 'jobs', title: 'Jobs: find work', steps: [
    ['cat-jobs', 'Jobs across Pakistan.'],
    ['sub-online-jobs', 'Online jobs.'],
    ['ad-online-jobs', 'A job ad.'],
  ] },
];
const flows = FLOWS.map((f) => ({
  id: f.id, title: f.title,
  steps: f.steps.map(([page, caption, next]) => ({ page, caption, next })),
})).filter((f) => f.steps.some((s) => has(s.page, 'desktop') || has(s.page, 'mobile')));

const GROUPS = [
  ['Start', (id) => ['home', 'motors', 'property', 'location-prompt', 'location-select', 'account-menu', 'sitemap', 'page-not-found'].includes(id)],
  ['Motors', (id) => id.startsWith('motors-')],
  ['Property', (id) => id.startsWith('prop-') || id === 'ad-plots'],
  ['Categories', (id) => id.startsWith('cat-')],
  ['Subcategories', (id) => id.startsWith('sub-')],
  ['Ads', (id) => id.startsWith('ad-')],
  ['Scrolled states', (id) => id.endsWith('-scrolled')],
  ['Search and location', (id) => /^(search|city|sorted)/.test(id)],
  ['Logged in', (id) => id.startsWith('account-')],
  ['Menus, sheets and login', () => true],
];
const ids = [...new Set(index.pages.map((p) => p.id))];
const groups = [];
const placed = new Set();
for (const [name, test] of GROUPS) {
  const list = ids.filter((id) => !placed.has(id) && test(id));
  list.forEach((id) => placed.add(id));
  if (list.length) groups.push({ name, pages: list.map((id) => ({ id, title: index.pages.find((p) => p.id === id).title })) });
}

await writeFile('prototype/data.json', JSON.stringify({ source: index.source, captured: index.captured, groups, flows, pages }) + '\n');
console.log(`prototype/data.json: ${Object.keys(pages).length} screens, ${linked} of ${total} links and buttons wired, ${flows.length} flows`);
