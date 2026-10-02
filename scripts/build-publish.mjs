// Build a flat, self-contained copy of the design system book for publishing as
// one web page: the book (foundations, components, templates), every captured
// screen with its live HTML and screenshot, every section's HTML, and the
// clickable prototype as a page inside it.
//
//   node scripts/build-publish.mjs            # writes dist/book/ and dist/book-manifest.json
//
// Section HTML files are packed into a few JSON bundles (site/sections/*.json),
// because a published page can carry only a limited number of files. The book
// and prototype read sections from the bundles when a screen names one.
import { cp, mkdir, readFile, rm, writeFile, readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const OUT = 'dist/book';
const BUNDLE_BYTES = 2_500_000;

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const copy = async (from, to = from) => { await mkdir(dirname(join(OUT, to)), { recursive: true }); await cp(from, join(OUT, to)); };

// The book at the root, reading everything relative to itself.
const bookHtml = (await readFile('book/index.html', 'utf8'))
  .replace('href="../css/tokens.css"', 'href="css/tokens.css"')
  .replace('<script src="book.js"></script>', '<script>window.BOOK_ROOT = "."; window.BOOK_DEFAULT_TAB = "shot"; window.BOOK_PROTO_DIR = "proto";</script>\n  <script src="book.js"></script>');
await writeFile(join(OUT, 'index.html'), bookHtml);
for (const f of ['book/book.js', 'book/book.css']) await copy(f, f.slice(5));
await copy('css/tokens.css');
await copy('tokens/tokens.json');

// Components and templates the book renders (not their unused stylesheets or placeholders).
async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}
for (const f of [...(await walk('components')), ...(await walk('templates'))]) {
  if (f.includes('/_css/') || f.endsWith('.gitkeep')) continue;
  await copy(f);
}
// Component states rendered from site captures (headers after scrolling and so on).
const components = JSON.parse(await readFile('components/index.json', 'utf8'));
for (const c of components.components) for (const f of [c.frame?.html, c.png, c.markup]) if (f) await copy(f);

// Every captured screen: page HTML and screenshot, shared CSS, section bundles.
const data = JSON.parse(await readFile('prototype/data.json', 'utf8'));
const css = new Set();
let bundle = {}, bundleSize = 0, bundleNo = 0;
const bundleFiles = [];
async function flush() {
  if (!bundleSize) return;
  const name = `site/sections/sections-${String(++bundleNo).padStart(2, '0')}.json`;
  await mkdir(join(OUT, 'site/sections'), { recursive: true });
  await writeFile(join(OUT, name), JSON.stringify(bundle));
  bundleFiles.push(name);
  bundle = {}; bundleSize = 0;
}
for (const s of Object.values(data.pages)) {
  const html = s.html.replace('../', ''), png = s.image.replace('../', '');
  await copy(html); await copy(png);
  for (const m of (await readFile(html, 'utf8')).matchAll(/href="(?:\.\.\/)+css\/([0-9a-f]+\.css)"/g)) css.add(m[1]);
  let size = 0;
  const secs = {};
  for (const sec of s.sections) {
    const text = await readFile(sec.html.replace('../', ''), 'utf8');
    for (const m of text.matchAll(/href="(?:\.\.\/)+css\/([0-9a-f]+\.css)"/g)) css.add(m[1]);
    secs[sec.html] = text; size += text.length;
  }
  if (bundleSize + size > BUNDLE_BYTES) await flush();
  Object.assign(bundle, secs); bundleSize += size;
  s.bundle = `../site/sections/sections-${String(bundleNo + 1).padStart(2, '0')}.json`;
}
await flush();
for (const f of css) await copy(`site/css/${f}`);

// The prototype as a page inside the book (in proto/: the publisher reserves "prototype").
await mkdir(join(OUT, 'proto'), { recursive: true });
await writeFile(join(OUT, 'proto/data.json'), JSON.stringify(data));
await writeFile(join(OUT, 'proto/index.html'), (await readFile('prototype/index.html', 'utf8'))
  .replace('<script src="prototype.js"></script>', '<script>window.PROTO_ROOT = "../"; window.PROTO_BOOK = "../";</script>\n  <script src="prototype.js"></script>'));
for (const f of ['prototype.js', 'prototype.css']) await copy(`prototype/${f}`, `proto/${f}`);

// List what to publish: text and pages first, screenshots after (they fill most of the size).
const files = (await walk(OUT)).map((f) => f.slice(OUT.length + 1)).filter((f) => f !== 'index.html').sort();
const sizes = Object.fromEntries(await Promise.all(files.map(async (f) => [f, (await stat(join(OUT, f))).size])));
const total = Object.values(sizes).reduce((a, b) => a + b, 0);
await writeFile('dist/book-manifest.json', JSON.stringify({ files, sizes }, null, 1));
console.log(`${OUT}: ${files.length + 1} files, ${(total / 1e6).toFixed(1)} MB; ${Object.keys(data.pages).length} screens, ${bundleFiles.length} section bundles, ${css.size} stylesheets`);
