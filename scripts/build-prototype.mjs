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
    if (/^\/motors/.test(path)) return { to: firstAvailable(vp, 'motors') };
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
    id, vp, title: m.title, url: m.url, width: m.width, height: m.height, overlay: m.overlay,
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
  { id: 'motors', title: 'Motors: find a car', steps: [
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
  ['Start', (id) => ['home', 'motors', 'property', 'location-prompt', 'location-select', 'account-menu', 'sitemap'].includes(id)],
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
