// Check that every stored capture still renders like the live screenshot it was
// taken with. Each stored HTML file (site pages, page templates, components) is
// rendered in Chromium at its captured size and device pixel ratio, screenshotted,
// and compared pixel by pixel with the PNG saved next to it.
//
//   node scripts/verify-pixels.mjs            # everything
//   node scripts/verify-pixels.mjs templates  # or: site | templates | components
//   ONLY=home node scripts/verify-pixels.mjs  # ids containing "home"
//
// Writes audit/pixel-report.json and audit/pixel-report.md. Diff images (changed
// pixels in red over a faded render) go to audit/pixel-diffs/, which is git-ignored.
//
// Remote files the captures load (listing photos, OLX icons) are fetched by Node and
// handed to the browser, so the bundled Chromium doesn't need to trust the session
// proxy's certificate chain; certificate checks stay on in Node.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const ORIGIN = 'https://www.olx.com.pk';
const DIFFS = 'audit/pixel-diffs';
// A pixel counts as changed when any channel differs by more than this (0–255).
// Antialiasing and image resampling stay under it; real layout or colour changes don't.
const CHANNEL_TOLERANCE = 48;
// Verdicts by share of changed pixels.
const MATCH = 0.005, CLOSE = 0.03;

const groups = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const want = (g) => !groups.length || groups.includes(g);
const only = process.env.ONLY;

// ---------- targets ----------
const targets = [];
if (want('site')) {
  const index = JSON.parse(await readFile('site/index.json', 'utf8'));
  for (const p of index.pages) {
    const base = `site/pages/${p.id}/${p.viewport}`;
    if (!existsSync(`${base}.html`) || !existsSync(`${base}.png`)) continue;
    const meta = JSON.parse(await readFile(`${base}.json`, 'utf8'));
    // "Scrolled" captures are the screen after scrolling (sticky headers); the static
    // HTML can't be put back in that scroll state, so they aren't compared.
    if (meta.scrolled) { targets.push({ group: 'site', id: `${p.id}~${p.viewport}`, skip: 'scroll state, not comparable from static HTML' }); continue; }
    targets.push({ group: 'site', id: `${p.id}~${p.viewport}`, html: `${base}.html`, png: `${base}.png`, width: meta.width, height: meta.height, dpr: meta.dpr ?? 1, fullPage: !meta.overlay });
  }
}
if (want('templates')) {
  const index = JSON.parse(await readFile('templates/index.json', 'utf8'));
  for (const t of index.templates) {
    const base = `templates/${t.page}/${t.viewport}`;
    if (!existsSync(`${base}.html`) || !existsSync(`${base}.png`)) continue;
    targets.push({ group: 'templates', id: `${t.page}~${t.viewport}`, html: `${base}.html`, png: `${base}.png`, width: t.width, height: t.height, dpr: t.dpr ?? 1, fullPage: true });
  }
}
if (want('components')) {
  const index = JSON.parse(await readFile('components/index.json', 'utf8'));
  const tdpr = Object.fromEntries(JSON.parse(await readFile('templates/index.json', 'utf8')).templates.map((t) => [`${t.page}~${t.viewport}`, t.dpr ?? 1]));
  for (const c of index.components) {
    const base = `components/${c.name}/${c.viewport}`;
    if (!existsSync(`${base}.html`) || !existsSync(`${base}.png`)) continue;
    targets.push({ group: 'components', id: `${c.name}~${c.viewport}`, html: `${base}.html`, png: `${base}.png`, width: c.viewport === 'mobile' ? 390 : 1440, height: Math.max(c.height, 200), dpr: tdpr[`${c.page}~${c.viewport}`] ?? (c.viewport === 'mobile' ? 3 : 1), element: true });
  }
}
const todo = targets.filter((t) => !only || t.id.includes(only));

// ---------- local static server for the repo ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  try {
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const LOCAL = `http://127.0.0.1:${server.address().port}`;

// ---------- browser ----------
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const remote = new Map();
async function fetchRemote(url) {
  if (!remote.has(url)) {
    remote.set(url, fetch(url, { headers: { referer: `${ORIGIN}/` } }).then(async (r) => ({ status: r.status, type: r.headers.get('content-type') ?? '', body: Buffer.from(await r.arrayBuffer()) })).catch(() => null));
  }
  return remote.get(url);
}

const settle = `
  /* Jump every animation to its end state (fade-ins, slide-ins) instead of removing it,
     which would leave popups at their invisible first frame. */
  *, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; animation-fill-mode: both !important; transition: none !important; caret-color: transparent !important; }
`;

async function render(t) {
  const ctx = await browser.newContext({ viewport: { width: t.width, height: t.fullPage || t.element ? 900 : t.height }, deviceScaleFactor: t.dpr });
  await ctx.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith(LOCAL)) {
      const path = new URL(url).pathname;
      // Root-relative OLX paths (/assets/…) in the capture point at the live site.
      if (!existsSync(join(ROOT, decodeURIComponent(path)))) {
        const r = await fetchRemote(ORIGIN + path + new URL(url).search);
        return r ? route.fulfill({ status: r.status, contentType: r.type, body: r.body }) : route.abort();
      }
      return route.continue();
    }
    if (/^https?:/.test(url)) {
      if (/accounts\.google\.com|googletagmanager|google-analytics|doubleclick|facebook/.test(url)) return route.abort();
      const r = await fetchRemote(url);
      return r ? route.fulfill({ status: r.status, contentType: r.type, body: r.body }) : route.abort();
    }
    return route.continue();
  });
  const page = await ctx.newPage();
  try {
    await page.goto(`${LOCAL}/${t.html}`, { waitUntil: 'load', timeout: 90_000 });
    await page.addStyleTag({ content: settle });
    // Lazy images: bring each into view once, then wait for fonts and images.
    await page.evaluate(async () => {
      document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
      for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); }
      scrollTo(0, 0);
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 8000); }))));
    });
    await page.waitForTimeout(300);
    // Photo boxes (user content that changes or fails to load), in CSS pixels.
    t.photos = await page.evaluate(() => [...document.images].filter((i) => /images\.olx\.com\.pk|amazonaws\.com/.test(i.currentSrc || i.src))
      .map((i) => { const r = i.getBoundingClientRect(); return [r.x + scrollX, r.y + scrollY, r.width, r.height]; }));
    if (t.element) {
      const el = page.locator('body > *').first();
      const box = await el.boundingBox();
      if (box) t.photos = t.photos.map(([x, y, w, h]) => [x - box.x, y - box.y, w, h]);
      return await el.screenshot({ animations: 'disabled', timeout: 60_000 });
    }
    // Use the window size the live screenshot was taken at (its PNG size / dpr), not the
    // measured page height: pages sized in vh units grow with the window, so the two differ.
    if (t.fullPage) {
      const { height } = PNG.sync.read(await readFile(t.png));
      await page.setViewportSize({ width: t.width, height: Math.max(1, Math.round(height / t.dpr)) });
      await page.waitForTimeout(300);
    }
    return await page.screenshot({ fullPage: false, animations: 'disabled' });
  } finally { await ctx.close(); }
}

function close(a, ia, b, ib) {
  for (let c = 0; c < 3; c++) if (Math.abs(a.data[ia + c] - b.data[ib + c]) > CHANNEL_TOLERANCE) return false;
  return true;
}
function nearMatch(a, ia, b, x, y) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= b.width || ny >= b.height) continue;
      if (close(a, ia, b, (ny * b.width + nx) * 4)) return true;
    }
  }
  return false;
}

function compare(aBuf, bBuf, mask = []) {
  const a = PNG.sync.read(aBuf), b = PNG.sync.read(bBuf);
  const w = Math.max(a.width, b.width), h = Math.max(a.height, b.height);
  const diff = new PNG({ width: w, height: h });
  let changed = 0, masked = 0;
  const skip = new Uint8Array(w * h);
  for (const [mx, my, mw, mh] of mask) {
    for (let y = Math.max(0, my); y < Math.min(h, my + mh); y++) skip.fill(1, y * w + Math.max(0, mx), y * w + Math.min(w, mx + mw));
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const inA = x < a.width && y < a.height, inB = x < b.width && y < b.height;
      if (skip[y * w + x]) { masked++; diff.data.set([120, 170, 255, 255], o); continue; }
      let bad = !(inA && inB);
      const ia = (y * a.width + x) * 4, ib = (y * b.width + x) * 4;
      // Antialiasing can move a glyph edge by a pixel between machines, so a pixel
      // only counts as changed when no pixel within 1px in the other image matches it.
      if (!bad && !close(a, ia, b, ib)) bad = !nearMatch(a, ia, b, x, y);
      if (bad) { changed++; diff.data.set([230, 0, 40, 255], o); }
      else { const g = 255 - (255 - (a.data[ia] + a.data[ia + 1] + a.data[ia + 2]) / 3) * 0.25; diff.data.set([g, g, g, 255], o); }
    }
  }
  return { ratio: changed / Math.max(1, w * h - masked), masked: masked / (w * h), sizeLive: [a.width, a.height], sizeStored: [b.width, b.height], diff };
}

// ---------- run ----------
await mkdir(DIFFS, { recursive: true });
const results = [];
for (const [i, t] of todo.entries()) {
  let r;
  if (t.skip) { r = { group: t.group, id: t.id, verdict: 'skipped', note: t.skip }; results.push(r); console.log(`${String(i + 1).padStart(3)}/${todo.length} skipped  -\t${t.group}/${t.id}`); continue; }
  try {
    const shot = await render(t);
    const mask = process.env.MASK_PHOTOS ? (t.photos ?? []).map((r) => r.map((v) => Math.round(v * t.dpr))) : [];
    const c = compare(await readFile(t.png), shot, mask);
    // Almost all photo (a gallery): the score would measure a few edge pixels only.
    const verdict = c.masked > 0.95 ? 'match' : c.ratio <= MATCH ? 'match' : c.ratio <= CLOSE ? 'close' : 'mismatch';
    if (verdict !== 'match') {
      const name = `${DIFFS}/${t.group}--${t.id.replace('~', '--')}`;
      await writeFile(`${name}.png`, PNG.sync.write(c.diff));
      await writeFile(`${name}.render.png`, shot);
    }
    r = { group: t.group, id: t.id, verdict, changed: +(c.ratio * 100).toFixed(2), photosMasked: +(c.masked * 100).toFixed(1), live: c.sizeLive, stored: c.sizeStored };
  } catch (e) {
    r = { group: t.group, id: t.id, verdict: 'error', error: e.message.split('\n')[0] };
  }
  results.push(r);
  console.log(`${String(i + 1).padStart(3)}/${todo.length} ${r.verdict.padEnd(8)} ${r.changed ?? '-'}%\t${r.group}/${r.id}${r.error ? '  ' + r.error : ''}`);
}
await browser.close();
server.close();

// Merge with an earlier report so partial runs (one group, ONLY=) keep the rest.
let previous = [];
try { previous = JSON.parse(await readFile('audit/pixel-report.json', 'utf8')).results; } catch { /* first run */ }
const key = (r) => `${r.group}/${r.id}`;
const merged = new Map(previous.map((r) => [key(r), r]));
for (const r of results) merged.set(key(r), r);
const all = [...merged.values()].sort((a, b) => key(a).localeCompare(key(b)));

const fonts = existsSync('fonts') ? 'Geomanist (fonts/)' : 'fallback (fonts/ missing: run npm run fetch-fonts)';
await writeFile('audit/pixel-report.json', JSON.stringify({ checked: new Date().toISOString(), tolerance: CHANNEL_TOLERANCE, thresholds: { match: MATCH, close: CLOSE }, fonts, results: all }, null, 1) + '\n');

const count = (g, v) => all.filter((r) => r.group === g && r.verdict === v).length;
const lines = [
  '# Pixel check: stored captures vs the live screenshots',
  '',
  `Checked ${new Date().toISOString().slice(0, 10)} with \`node scripts/verify-pixels.mjs\`. Each stored HTML file is rendered at its captured size and device pixel ratio and compared with the screenshot taken from olx.com.pk at capture time. A pixel counts as changed when a colour channel differs by more than ${CHANNEL_TOLERANCE}/255 and no pixel within 1px of it in the other image is close (so 1px antialiasing shifts don't count). Fonts: ${fonts}.`,
  '',
  `**match** ≤ ${MATCH * 100}% of pixels changed · **close** ≤ ${CLOSE * 100}% · **mismatch** above that. Listing photos are user content and can change or disappear on OLX, so a small share of changes in photo areas is expected.`,
  '',
  '| Group | Match | Close | Mismatch | Error | Skipped |',
  '| --- | --- | --- | --- | --- | --- |',
  ...['site', 'templates', 'components'].map((g) => `| ${g} | ${count(g, 'match')} | ${count(g, 'close')} | ${count(g, 'mismatch')} | ${count(g, 'error')} | ${count(g, 'skipped')} |`),
  '',
  '## Not matching',
  '',
  '| Capture | Verdict | Changed | Live size | Rendered size |',
  '| --- | --- | --- | --- | --- |',
  ...all.filter((r) => !['match', 'skipped'].includes(r.verdict)).sort((a, b) => (b.changed ?? 101) - (a.changed ?? 101))
    .map((r) => `| ${r.group}/${r.id} | ${r.verdict} | ${r.changed ?? '-'}% | ${r.live?.join('×') ?? '-'} | ${r.stored?.join('×') ?? r.error ?? '-'} |`),
  '',
];
await writeFile('audit/pixel-report.md', lines.join('\n'));
console.log(`\naudit/pixel-report.md: ${results.length} checked, ${results.filter((r) => r.verdict === 'match').length} match`);
