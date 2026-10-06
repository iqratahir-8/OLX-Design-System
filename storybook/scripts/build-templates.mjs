#!/usr/bin/env node
/**
 * Turns the raw captures into the browsable page templates Storybook and the design kit share.
 *
 * Each template is the captured page with scripts removed, every asset URL made absolute so the
 * production CSS/images still load, and every link to another captured page repointed at that
 * page's template file — so the flows are clickable inside the frame. Forms are left visible but
 * cannot submit: these are real pages, and a lead/finance/insurance form must never post.
 *
 *   node scripts/build-templates.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'design-kit/templates');
const sites = JSON.parse(readFileSync(join(ROOT, 'design-kit/sites.json'), 'utf8'));
const DEVICES = ['desktop', 'mobile'];

/** Every captured page, as site/device/name plus the live path it came from. */
const captured = [];
for (const [siteName, site] of Object.entries(sites)) {
  if (site.fromDir) {
    const manifest = JSON.parse(readFileSync(join(ROOT, site.fromDir, 'manifest.json'), 'utf8'));
    for (const p of manifest.pages) {
      if (p.status !== 200 || p.redirected) continue;
      captured.push({ site: siteName, name: p.name, device: p.device, path: p.final, src: join(ROOT, site.fromDir, p.file), label: null });
    }
  } else {
    const indexFile = join(ROOT, 'design-kit/raw', siteName, 'pages.json');
    if (!existsSync(indexFile)) { console.log(`skip   ${siteName} — not captured yet (node scripts/capture-site.mjs ${siteName})`); continue; }
    const index = JSON.parse(readFileSync(indexFile, 'utf8'));
    for (const [name, p] of Object.entries(index.pages)) {
      for (const device of p.devices ?? []) {
        const src = join(ROOT, 'design-kit/raw', siteName, device, `${name}.html`);
        if (existsSync(src)) captured.push({ site: siteName, name, device, path: p.path, src, label: p.label, capturedAt: p.capturedAt, title: p.title });
      }
    }
  }
}

const norm = (p) => {
  const [path, query] = p.split('?');
  return (path.replace(/\/+$/, '') || '/') + (query ? `?${query}` : '');
};
/** live path -> template file, per device, so a link lands on the same device's capture. */
const byPath = {};
for (const d of DEVICES) byPath[d] = new Map();
for (const c of captured) byPath[c.device]?.set(norm(c.path), c);

const ORIGIN = 'https://www.olx.com.pk';
const ATTRS = /\b(href|src|poster|data-src|data-srcset|srcset|content)=("|')(.*?)\2/gis;

function absolutizeValue(attr, value, origin) {
  const one = (u) => {
    const t = u.trim();
    if (!t || /^(data:|blob:|mailto:|tel:|javascript:|#|https?:|\/\/)/i.test(t)) return u;
    if (t.startsWith('/')) return origin + t;
    return u;
  };
  if (attr === 'srcset' || attr === 'data-srcset') {
    return value.split(',').map((part) => {
      const m = part.trim().match(/^(\S+)(\s+\S+)?$/);
      return m ? one(m[1]) + (m[2] ?? '') : part;
    }).join(', ');
  }
  return one(value);
}

/** Cuts out one element and its children, counting nested tags so the close tag matches. */
function removeElementById(html, id) {
  const open = new RegExp(`<(\\w+)\\b[^>]*\\bid=("|')${id}\\2[^>]*>`, 'i');
  const m = html.match(open);
  if (!m) return html;
  const tag = m[1];
  const start = m.index;
  const scan = new RegExp(`<${tag}\\b[^>]*>|</${tag}\\s*>`, 'gi');
  scan.lastIndex = start + m[0].length;
  let depth = 1, hit;
  while (depth > 0 && (hit = scan.exec(html))) depth += hit[0].startsWith('</') ? -1 : 1;
  return depth === 0 ? html.slice(0, start) + html.slice(scan.lastIndex) : html;
}

function build(page) {
  let html = readFileSync(page.src, 'utf8');
  const origin = ORIGIN;

  // No JS: the captures are frozen DOM, and re-running the apps' scripts would hydrate over the
  // markup, fire analytics and re-request data that is no longer there.
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
  html = html.replace(/<script\b[^>]*\/>/gi, '');
  html = html.replace(/<link\b[^>]*\brel=("|')?(?:modulepreload|preload|prefetch|dns-prefetch|preconnect)\1?[^>]*>/gi, '');
  html = html.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi, '');
  // The push-permission prompt is a browser nag the capture froze mid-page, not page design.
  html = removeElementById(html, 'moe-push-div');

  html = html.replace(ATTRS, (m, attr, q, value) => {
    const a = attr.toLowerCase();
    if (a === 'content' && !/^\/[^/]/.test(value.trim())) return m;
    return `${attr}=${q}${absolutizeValue(a, value, origin)}${q}`;
  });
  // url(...) inside <style> blocks and style attributes
  html = html.replace(/url\((\s*['"]?)(\/[^'")]+)\1\)/gi, (m, q, u) => `url(${q}${origin}${u}${q})`);

  // Links: another captured page -> its template file; anything else -> live site in a new tab.
  const map = byPath[page.device];
  let internal = 0;
  html = html.replace(/<a\b([^>]*?)>/gis, (m, attrs) => {
    const hrefMatch = attrs.match(/\bhref=("|')(.*?)\1/is);
    if (!hrefMatch) return m;
    const raw = hrefMatch[2].trim();
    if (/^(#|mailto:|tel:|javascript:)/i.test(raw)) return m;
    let url;
    try { url = new URL(raw, origin); } catch { return m; }
    if (url.origin !== origin) return m.replace(/<a\b/i, '<a target="_blank" rel="noreferrer"');
    const hit = map.get(norm(url.pathname + url.search)) ?? map.get(norm(url.pathname));
    if (hit) {
      internal++;
      const rel = hit.site === page.site ? `${hit.name}.html` : `../../${hit.site}/${page.device}/${hit.name}.html`;
      return m.replace(/\bhref=("|').*?\1/is, `href="${rel}" data-template-link="${hit.site}/${hit.name}"`);
    }
    return m.replace(/<a\b/i, '<a target="_blank" rel="noreferrer" data-live-link="1"').replace(/\bhref=("|').*?\1/is, `href="${url.href}"`);
  });

  // Real pages carry real lead forms. Keep them visible, make them inert.
  html = html.replace(/<form\b([^>]*)>/gi, (m, attrs) =>
    `<form${attrs.replace(/\baction=("|').*?\1/gis, '')} action="#" onsubmit="return false;" data-submit-disabled="1">`);

  const label = page.label ?? page.name.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const stamp = `<meta name="olx-template" content="${page.site}/${page.name} · ${page.device} · ${internal} in-kit links · captured ${page.capturedAt ?? 'see manifest'} from ${origin}${page.path}">`;
  html = html.replace(/<head([^>]*)>/i, `<head$1>${stamp}<base target="_self">`);
  return { html, label, internal };
}

// Only the generated site folders are rebuilt; _assets/ holds the downloaded CSS and fonts.
for (const site of Object.keys(sites)) rmSync(join(OUT, site), { recursive: true, force: true });
const manifest = { _purpose: 'Browsable page templates built from the captures by scripts/build-templates.mjs. Scripts stripped, assets absolutized, in-kit links rewritten, forms inert.', sites: {} };
for (const [siteName, site] of Object.entries(sites)) {
  const pages = {};
  for (const page of captured.filter((c) => c.site === siteName)) {
    const { html, label, internal } = build(page);
    mkdirSync(join(OUT, siteName, page.device), { recursive: true });
    writeFileSync(join(OUT, siteName, page.device, `${page.name}.html`), html);
    const prev = pages[page.name] ?? { label, devices: [], links: {} };
    prev.label = prev.label ?? label;
    prev.devices = [...new Set([...prev.devices, page.device])];
    prev.links[page.device] = internal;
    prev.path = page.path;
    if (page.capturedAt) prev.capturedAt = page.capturedAt;
    pages[page.name] = prev;
  }
  manifest.sites[siteName] = { label: site.label, source: site.source, origin: site.origin, flows: site.flows ?? [], pages };
}
writeFileSync(join(OUT, 'templates.json'), JSON.stringify(manifest, null, 1));
const n = Object.values(manifest.sites).reduce((a, s) => a + Object.keys(s.pages).length, 0);
for (const [k, s] of Object.entries(manifest.sites)) console.log(`${k.padEnd(12)} ${String(Object.keys(s.pages).length).padStart(3)} pages`);
console.log(`templates  ${n} pages -> design-kit/templates/`);
