#!/usr/bin/env node
/**
 * Renders live olx.com.pk pages (classifieds + property) in real Chrome and saves the rendered
 * DOM to design-kit/raw/<site>/<device>/<name>.html. GET navigation and scrolling only — nothing
 * is clicked, typed or submitted. Pages that redirect elsewhere (login walls) are not saved.
 *
 *   node scripts/capture-site.mjs                 # classifieds + property, desktop + mobile
 *   node scripts/capture-site.mjs property        # one site
 *   node scripts/capture-site.mjs classifieds --only=home,ad-detail
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sites = JSON.parse(readFileSync(join(ROOT, 'design-kit/sites.json'), 'utf8'));
const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const wanted = args.filter((a) => !a.startsWith('--'));
const siteNames = (wanted.length ? wanted : ['classifieds', 'property']).filter((s) => sites[s]?.pages);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DEVICES = {
  desktop: {
    viewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  },
  mobile: {
    viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  },
};

async function scrollThrough(page) {
  let last = 0;
  for (let i = 0; i < 40; i++) {
    const { y, h, vh } = await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 0.8);
      return { y: scrollY, h: document.documentElement.scrollHeight, vh: innerHeight };
    });
    await sleep(300);
    if (y + vh >= h - 2 && h === last) break;
    last = h;
  }
  await page.evaluate(() => scrollTo(0, 0));
  await sleep(600);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] });
const norm = (p) => p.replace(/\/$/, '') || '/';

for (const siteName of siteNames) {
  const site = sites[siteName];
  const rawDir = join(ROOT, 'design-kit/raw', siteName);
  const indexFile = join(rawDir, 'pages.json');
  const index = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')) : { pages: {} };
  index.origin = site.origin;

  const resolvePath = (page) => {
    if (page.path) return page.path;
    // discovered from links saved while capturing another page of any site
    for (const s of siteNames.concat(Object.keys(sites).filter((k) => sites[k].pages))) {
      const f = join(ROOT, 'design-kit/raw', s, 'pages.json');
      const links = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')).pages?.[page.from]?.links : null;
      const rx = new RegExp(page.match);
      const hit = links?.find((l) => rx.test(l));
      if (hit) return hit;
    }
    return null;
  };

  for (const page of site.pages) {
    if (only && !only.includes(page.name)) continue;
    // desktop first so mobile (and later pages) can discover from its links
    for (const [device, cfg] of Object.entries(DEVICES)) {
      const path = resolvePath(page);
      if (!path) { console.log(`skip   ${siteName}/${device}/${page.name} — nothing matched on "${page.from}"`); continue; }
      const url = site.origin + path;
      const tab = await browser.newPage();
      await tab.setViewport(cfg.viewport);
      await tab.setUserAgent(cfg.ua);
      try {
        const res = await tab.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => tab.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }));
        const status = res?.status() ?? 0;
        const finalUrl = new URL(tab.url());
        const expected = page.expectStatus ?? 200;
        const want = new URL(url);
        if (norm(finalUrl.pathname) !== norm(want.pathname) || finalUrl.origin !== want.origin) {
          console.log(`skip   ${siteName}/${device}/${page.name} — redirected to ${finalUrl.pathname}${finalUrl.search}`);
          index.pages[page.name] = { ...index.pages[page.name], label: page.label, skipped: `redirects to ${finalUrl.pathname}` };
          continue;
        }
        if (status !== expected) { console.log(`skip   ${siteName}/${device}/${page.name} — HTTP ${status}`); continue; }
        await sleep(1500);
        await scrollThrough(tab);
        const links = await tab.evaluate(() =>
          [...new Set([...document.querySelectorAll('a[href]')].map((a) => { try { const u = new URL(a.href); return u.origin === location.origin ? u.pathname + u.search : null; } catch { return null; } }).filter(Boolean))],
        );
        const html = '<!DOCTYPE html>' + (await tab.evaluate(() => document.documentElement.outerHTML));
        mkdirSync(join(rawDir, device), { recursive: true });
        writeFileSync(join(rawDir, device, `${page.name}.html`), html);
        const prev = index.pages[page.name] || {};
        index.pages[page.name] = {
          label: page.label, path, status, title: await tab.title(),
          capturedAt: new Date().toISOString().slice(0, 10),
          links: device === 'desktop' ? links : prev.links ?? links,
          devices: [...new Set([...(prev.devices || []), device])],
        };
        delete index.pages[page.name].skipped;
        console.log(`saved  ${siteName}/${device}/${page.name}  ${(html.length / 1024).toFixed(0)} KB  ${path}`);
      } catch (err) {
        console.log(`fail   ${siteName}/${device}/${page.name} — ${err.message}`);
      } finally {
        await tab.close();
      }
      await sleep(500);
    }
    mkdirSync(rawDir, { recursive: true });
    writeFileSync(indexFile, JSON.stringify(index, null, 1));
  }
}
await browser.close();
