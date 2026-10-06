#!/usr/bin/env node
/**
 * Makes the templates' typography work offline.
 *
 * The pages pull their CSS from the OLX CDNs, which is fine, but the font files behind that CSS
 * are CORS-locked to www.olx.com.pk — served from anywhere else the browser refuses them and the
 * pages fall back to a system font, which is exactly the thing a design system must not get wrong.
 * So each stylesheet is downloaded once into design-kit/templates/_assets/, its font URLs are
 * repointed at local copies, and the templates link the local stylesheet instead. Images stay
 * remote: they are not CORS-checked and keeping them remote keeps the repo small.
 *
 * design-kit/templates/_assets/manifest.json records url -> file, so later runs work offline.
 *
 *   node scripts/localize-assets.mjs            # fetch what's missing
 *   node scripts/localize-assets.mjs --offline  # only reuse what's already downloaded
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TPL = join(ROOT, 'design-kit/templates');
const ASSETS = join(TPL, '_assets');
const MANIFEST = join(ASSETS, 'manifest.json');
const OFFLINE = process.argv.includes('--offline');
const FONT = /\.(woff2?|ttf|otf|eot)(\?|#|$)/i;
// SVGs referenced from CSS are blocked cross-origin ("unsafe attempt to load URL"), so the
// icons come along too. Raster images are not blocked and stay remote to keep the repo small.
const SVG = /\.svg(\?|#|$)/i;

mkdirSync(join(ASSETS, 'css'), { recursive: true });
mkdirSync(join(ASSETS, 'fonts'), { recursive: true });
mkdirSync(join(ASSETS, 'icons'), { recursive: true });
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);
const failed = new Set();

async function download(url, kind) {
  if (manifest[url]) return manifest[url];
  if (OFFLINE || failed.has(url)) return null;
  const ext = kind === 'css' ? '.css' : (extname(new URL(url).pathname) || '.woff2').split(/[?#]/)[0];
  const dir = { css: 'css', font: 'fonts', icon: 'icons' }[kind];
  const file = `${dir}/${hash(url)}${ext}`;
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0', referer: 'https://www.olx.com.pk/' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(ASSETS, file), body);
    manifest[url] = file;
    return file;
  } catch (err) {
    failed.add(url);
    console.log(`  miss ${url.slice(0, 90)} — ${err.message}`);
    return null;
  }
}

/** Downloads a stylesheet, localises the fonts it references, absolutises everything else. */
async function localizeCss(url) {
  const file = await download(url, 'css');
  if (!file) return null;
  const full = join(ASSETS, file);
  let css = readFileSync(full, 'utf8');
  if (css.includes('/* localised */')) return file;
  const urls = [...new Set([...css.matchAll(/url\((\s*['"]?)([^'")]+)\1\)/gi)].map((m) => m[2].trim()))];
  for (const raw of urls) {
    if (/^(data:|#)/i.test(raw)) continue;
    let abs;
    try { abs = new URL(raw, url).href; } catch { continue; }
    let replacement = abs;
    if (FONT.test(abs) || SVG.test(abs)) {
      const local = await download(abs, FONT.test(abs) ? 'font' : 'icon');
      if (local) replacement = `../${local}`;
    }
    css = css.split(`(${raw})`).join(`(${replacement})`).split(`("${raw}")`).join(`("${replacement}")`).split(`('${raw}')`).join(`('${replacement}')`);
  }
  writeFileSync(full, `/* localised */\n${css}`);
  return file;
}

const files = [];
for (const site of readdirSync(TPL, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('_'))) {
  for (const device of readdirSync(join(TPL, site.name))) {
    for (const f of readdirSync(join(TPL, site.name, device))) {
      if (f.endsWith('.html')) files.push({ path: join(TPL, site.name, device, f), depth: 2 });
    }
  }
}

const sheets = new Map();
for (const { path } of files) {
  for (const m of readFileSync(path, 'utf8').matchAll(/<link\b[^>]*\bhref=("|')(https:\/\/[^"']+?\.css[^"']*)\1[^>]*>/gi)) {
    if (/rel=("|')?stylesheet/i.test(m[0])) sheets.set(m[2], null);
  }
}
console.log(`stylesheets  ${sheets.size} unique`);
let n = 0;
for (const url of sheets.keys()) {
  const file = await localizeCss(url);
  sheets.set(url, file);
  if (file) n++;
}
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));

// Two more cross-origin refusals to head off: SVG sprites pulled in with <use xlink:href>, and
// @font-face blocks the pages declare inline rather than in a stylesheet.
const sprites = new Map();
for (const { path } of files) {
  const html = readFileSync(path, 'utf8');
  for (const m of html.matchAll(/\b(?:xlink:href|href)=("|')(https:\/\/[^"']+?\.svg)(#[^"']*)?\1/gi)) sprites.set(m[2], 'icon');
  for (const m of html.matchAll(/https:\/\/[^"')\s]+?\.(?:woff2?|ttf|otf|eot)/gi)) sprites.set(m[0], 'font');
}
for (const [url, kind] of sprites) sprites.set(url, await download(url, kind));
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));

let rewritten = 0;
for (const { path, depth } of files) {
  let html = readFileSync(path, 'utf8');
  let changed = false;
  for (const [url, file] of sheets) {
    if (!file || !html.includes(url)) continue;
    html = html.split(url).join(`${'../'.repeat(depth)}_assets/${file}`);
    changed = true;
  }
  for (const [url, file] of sprites) {
    if (!file || !html.includes(url)) continue;
    html = html.split(url).join(`${'../'.repeat(depth)}_assets/${file}`);
    changed = true;
  }
  if (changed) { writeFileSync(path, html); rewritten++; }
}
const count = (p) => Object.values(manifest).filter((f) => f.startsWith(p)).length;
console.log(`localised    ${n}/${sheets.size} stylesheets, ${sprites.size} sprites, ${count('fonts/')} fonts, ${count('icons/')} icons -> ${rewritten} templates rewritten`);
