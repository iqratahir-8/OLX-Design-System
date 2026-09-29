// Read computed styles for key components on the live OLX site and write them to
// audit/live-snapshots/components.json. Selectors are text/structure based because
// the site's class names are hashed and change between builds.
//
//   node scripts/inspect-components.mjs
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const BASE = 'https://www.olx.com.pk';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60_000 });
const adPath = await page.locator('a[href*="/item/"]').first().getAttribute('href');
const pages = { home: '/', 'category-listing': '/mobile-phones_c1453', 'ad-detail': adPath };

// Each probe is [name, finder source]. Finders run in the page with helpers:
//   t(selector, regex)  innermost element matching selector whose trimmed text matches regex
//   box(el)             nearest ancestor-or-self (up to 4 levels) that paints a box (bg, border, radius or shadow)
const probes = {
  home: {
    topBar: `box(t('a,span', /^Motors$/)?.parentElement?.parentElement)`,
    logoTab: `box(document.querySelector('header a[href="/"]'))`,
    sellButton: `box(t('a,span,div', /^sell$/i))`,
    sellButtonLabel: `t('a,span,div', /^sell$/i)`,
    loginLink: `t('a,span,button', /^Login$/)`,
    locationField: `box(document.querySelector('header input:not([placeholder*="Find"])'))`,
    searchField: `box(document.querySelector('input[placeholder*="Find"]'))`,
    searchButton: `t('button', /^Search$/)`,
    categoryNavAll: `t('span,div,button', /^All categories$/i)`,
    categoryNavBar: `box(t('a', /^Motorcycles$/)?.parentElement)`,
    categoryNavLink: `t('a', /^Cars$/)`,
    categoryTileLabel: `t('a *', /^Mobiles$/)`,
    categoryTileIcon: `box(t('a *', /^Mobiles$/)?.closest('a')?.querySelector('img'))`,
    categoryTileLink: `t('a *', /^Mobiles$/)?.closest('a')`,
    sectionHeading: `t('h2,div,span', /^Mobile Phones$/i)`,
    viewMore: `t('a,span', /^View more$/i)`,
    appBannerTitle: `t('*', /^Find amazing deals/)`,
    appBannerLink: `t('*', /^Download OLX app now!?$/)`,
    appBanner: `box(t('*', /^Find amazing deals/)?.parentElement)`,
    footer: `document.querySelector('footer')`,
    footerHeading: `t('footer *', /^Popular Categories$/)`,
    footerLink: `t('footer a', /^Cars$/)`,
    socialIcon: `box(document.querySelector('a[href*="facebook.com"]'))`,
    copyrightText: `t('*', /^Classifieds in Pakistan/)`,
    copyrightBar: `box(t('*', /^Classifieds in Pakistan/)?.parentElement)`,
  },
  'category-listing': {
    breadcrumbLink: `t('a', /^Home$/)`,
    breadcrumbCurrent: `t('span,a,li', /^Mobile Phones in Pakistan$/)`,
    h1: `document.querySelector('h1')`,
    resultsBadge: `box(t('span,div', /^[\\d,]+\\+? Results$/))`,
    filterPanel: `box(t('span,div,h3', /^Categories$/)?.parentElement)`,
    filterHeading: `t('span,div,h3', /^Categories$/)`,
    filterItem: `t('a,span,li,div', /^Accessories/)`,
    filterItemActive: `t('a,span,li,div', /^Mobile Phones \\(/)`,
    filterItemCount: `t('span', /^\\([\\d,]+\\)$/)`,
    filterViewMore: `t('span,button,a,div', /^View more$/)`,
    brandChip: `box(t('a,span,button,div', /^Samsung$/))`,
    listCard: `t('article, li', /Rs /)`,
    adOfWeekBanner: `box(t('span,div', /^Ad of the Week$/))`,
    listCardFeaturedBadge: `box(t('span,div', /^Featured$/))`,
    callButton: `box(t('button,a,span', /^Call$/))`,
    chatButton: `box(t('button,a', /^Chat$/))`,
    whatsappButton: `box(t('button,a,span', /^WhatsApp$/))`,
    sortLabel: `t('span,div', /^Sort by:?$/)`,
  },
  'ad-detail': {
    gallery: `box([...document.querySelectorAll('img')].find((i) => i.getBoundingClientRect().width > 600)?.parentElement)`,
    price: `t('span,div,h3', /^Rs [\\d,.]+( (Lac|Lacs|Crore))?$/)`,
    title: `document.querySelector('h1')`,
    location: `t('span', /, [A-Z][a-z]+$/)`,
    detailsHeading: `t('h2,h3,div,span', /^Details$/)`,
    detailsLabel: `box(t('span,div', /^(Brand|Condition|Make)$/))`,
    detailsValue: `t('span,div,a', /^(Brand|Condition|Make)$/)?.nextElementSibling`,
    descriptionHeading: `t('h2,h3,div,span', /^Description$/)`,
    sellerCard: `box(t('span,div,p', /^Posted by$/)?.parentElement?.parentElement)`,
    sellerPostedBy: `t('span,div,p', /^Posted by$/)`,
    sellerName: `t('span,div,p', /^Posted by$/)?.nextElementSibling`,
    sellerStatLabel: `t('span,div,p', /^Member Since$/)`,
    showPhoneButton: `t('button', /Show phone number/)`,
    chatButton: `t('button', /^Chat$/)`,
    sellerAvatar: `box(t('*', /^Posted by$/)?.parentElement?.parentElement?.querySelector('img'))`,
    sellerStatValue: `t('*', /^Member Since$/)?.nextElementSibling`,
    adId: `t('span,div,p', /^Ad ID: \\d+$/)`,
    reportLink: `t('span,div,button,a', /^Report this ad$/)`,
    safetyHeading: `t('h2,h3,div,span', /^Your safety matters to us!?$/)`,
  },
};

const PROPS = ['display', 'color', 'background-color', 'background-image', 'font-family', 'font-size',
  'font-weight', 'line-height', 'text-transform', 'letter-spacing', 'padding', 'gap', 'border',
  'border-bottom', 'border-radius', 'box-shadow', 'object-fit'];

const out = {};
for (const [name, path] of Object.entries(pages)) {
  await page.goto(BASE + path, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForTimeout(3000);
  out[name] = { url: BASE + path };
  for (const [probe, src] of Object.entries(probes[name])) {
    out[name][probe] = await page.evaluate(([src, PROPS]) => {
      const t = (sel, re) => [...document.querySelectorAll(sel)].find((el) => re.test(el.textContent.trim())
        && ![...el.children].some((c) => re.test(c.textContent.trim())));
      const paints = (el) => {
        const cs = getComputedStyle(el);
        return cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none'
          || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderBottomWidth) > 0
          || cs.borderRadius !== '0px' || cs.boxShadow !== 'none';
      };
      const box = (el) => {
        let e = el;
        for (let i = 0; e && i < 5; i++, e = e.parentElement) if (paints(e)) return e;
        return el;
      };
      // eslint-disable-next-line no-new-func
      const el = new Function('t', 'box', `return ${src};`)(t, box);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const style = Object.fromEntries(PROPS.map((p) => [p, cs.getPropertyValue(p)])
        .filter(([, v]) => v && !['none', 'normal', '0px', 'rgba(0, 0, 0, 0)'].includes(v)));
      return { ...style, size: `${Math.round(r.width)}x${Math.round(r.height)}`, text: el.textContent.trim().slice(0, 40) };
    }, [src, PROPS]);
  }
}
await browser.close();
await writeFile('audit/live-snapshots/components.json', JSON.stringify(out, null, 2) + '\n');
console.log('wrote audit/live-snapshots/components.json');
