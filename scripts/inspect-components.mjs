// Read computed styles for key components on the live OLX site and write them to
// audit/live-snapshots/components.json. Selectors are text/structure based because
// the site's class names are hashed and change between builds.
//
//   node scripts/inspect-components.mjs
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const PROPS = ['display', 'color', 'background-color', 'background-image', 'font-family', 'font-size',
  'font-weight', 'line-height', 'letter-spacing', 'text-transform', 'padding', 'margin', 'gap', 'width', 'height',
  'border', 'border-bottom', 'border-radius', 'box-shadow', 'grid-template-columns'];

const pages = {
  home: '/',
  'category-listing': '/mobile-phones_c1453',
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const out = {};
for (const [name, path] of Object.entries(pages)) {
  await page.goto('https://www.olx.com.pk' + path, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForTimeout(3000);
  out[name] = await page.evaluate((PROPS) => {
    const style = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { ...Object.fromEntries(PROPS.map((p) => [p, cs.getPropertyValue(p)])), box: `${Math.round(r.width)}x${Math.round(r.height)}` };
    };
    const byText = (sel, re) => [...document.querySelectorAll(sel)].find((el) => re.test(el.textContent.trim()));
    const up = (el, n) => { for (let i = 0; i < n && el; i++) el = el.parentElement; return el; };
    const price = byText('span,div', /^Rs [\d.,]+( (Lac|Lacs|Crore))?$/);
    const card = price?.closest('li, article') ?? up(price, 4);
    const title = card && [...card.querySelectorAll('h2,div,span')].find((el) => el !== price && el.children.length === 0 && el.textContent.trim().length > 12);
    const q = (s) => document.querySelector(s);
    return {
      body: style(document.body),
      header: style(q('header')),
      logo: style(q('header a[href="/"] svg, header svg')),
      searchInput: style(q('header input[type="search"], header input[placeholder*="Find"], input[placeholder*="Find"]')),
      searchButton: style(byText('header button, button', /^Search$/) ?? q('button[aria-label="Search"]')),
      locationInput: style(q('header input:not([placeholder*="Find"])')),
      loginLink: style(byText('header a, header button, header span', /^Login$/)),
      sellButton: style(byText('header a, header button, header div', /^\+?\s*Sell$/i)),
      categoryNavLink: style(byText('a, span', /^Mobile Phones$/)),
      allCategories: style(byText('span, button, div', /^All Categories$/)),
      categoryTileLabel: style(byText('span, div, p', /^Mobiles$/)),
      sectionHeading: style(byText('h2, h3, span', /^(Mobile Phones|Cars)$/) && [...document.querySelectorAll('h2')].find((h) => /Mobile Phones|Cars/.test(h.textContent))),
      viewMore: style(byText('a, span', /^View More$/i)),
      listingCard: style(card),
      listingPrice: style(price),
      listingTitle: style(title),
      listingMeta: style(card && [...card.querySelectorAll('span')].find((s) => /ago$/.test(s.textContent.trim()))),
      featuredTag: style(byText('span, div', /^Featured$/)),
      breadcrumb: style(byText('a, span', /^Home$/)),
      h1: style(q('h1')),
      filterHeading: style(byText('span, div, h3', /^(Categories|Location|Price)$/)),
      footer: style(q('footer')),
      footerHeading: style(byText('footer *', /^Popular Categories$/)),
      footerLink: style(q('footer a')),
      copyrightBar: style(byText('div, section, span', /Classifieds in Pakistan/) && up(byText('span, div', /Classifieds in Pakistan/), 1)),
    };
  }, PROPS);
}
await browser.close();
await writeFile('audit/live-snapshots/components.json', JSON.stringify(out, null, 2) + '\n');
console.log('wrote audit/live-snapshots/components.json');
