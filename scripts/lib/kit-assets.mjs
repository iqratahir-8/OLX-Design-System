// Serve the CSS, fonts and icons a design-kit build saved (storybook/design-kit/
// templates/_assets/) at their original CDN URLs, for captures made where the
// Motors CDNs cannot be reached. Used by import-motors.mjs and by
// capture-site.mjs --kit=<templates>.
import { readFile, mkdir, copyFile, access } from 'node:fs/promises';
import { basename, join } from 'node:path';

export async function kitAssets(dir) {
  const manifest = JSON.parse(await readFile(join(dir, '_assets/manifest.json'), 'utf8'));
  const original = Object.fromEntries(Object.entries(manifest).map(([url, file]) => [file, url]));
  const saved = Object.fromEntries(Object.entries(manifest).map(([url, file]) => [url, join(dir, '_assets', file)]));

  // Kit pages and stylesheets refer to saved files relatively; point them back at the CDN.
  const unrewriteHtml = (html) => html.replace(/(["'(])(?:\.\.\/\.\.\/)?_assets\/((?:css|fonts|icons)\/[\w.-]+)/g, (m, q, file) => (original[file] ? q + original[file] : m));
  const unrewriteCss = (css) => css.replace(/url\((['"]?)\.\.\/((?:fonts|icons|css)\/[\w.-]+)\1\)/g, (m, q, file) => (original[file] ? `url(${q}${original[file]}${q})` : m));

  // Every kit page links the same global Next.js sheet (data-n-g). After a
  // deploy the live site names it differently; the kit's copy stands in for it.
  const globalUrl = Object.keys(saved).find((u) => /\/_next\/static\/css\/24264301298e10eb09e1\.css$/.test(u));

  // A Playwright route handler: saved assets come from disk; anything else is
  // aborted (offline import) or let through (live capture, passThrough). With
  // passThrough, a Motors stylesheet the kit does not have gets the kit's global
  // sheet, marked as a stand-in in the CSS.
  const route = ({ passThrough = false } = {}) => async (r) => {
    const url = r.request().url().split('#')[0];
    let file = saved[url], note = '';
    if (!file && passThrough && globalUrl && /^https:\/\/motors-asset-cdn\.[^/]+\/_next\/static\/css\/[\w-]+\.css$/.test(url)) {
      file = saved[globalUrl];
      note = `/* stand-in: ${url} is not in the design kit; this is the kit's global sheet (${globalUrl}) */\n`;
    }
    if (!file) return passThrough ? r.continue() : r.abort();
    const body = await readFile(file);
    const type = /\.css$/.test(file) ? 'text/css' : /\.svg$/.test(file) ? 'image/svg+xml' : /\.woff2$/.test(file) ? 'font/woff2' : /\.woff$/.test(file) ? 'font/woff' : 'application/octet-stream';
    return r.fulfill({ body: type === 'text/css' ? note + unrewriteCss(body.toString()) : body, contentType: type, headers: { 'access-control-allow-origin': '*' } });
  };

  // The capture prefers fonts in fonts/ (git-ignored) by file name; put the saved fonts there.
  const copyFonts = async () => {
    await mkdir('fonts', { recursive: true });
    for (const [url, file] of Object.entries(saved)) {
      if (!/\.woff2?$/.test(url)) continue;
      const to = `fonts/${basename(new URL(url).pathname)}`;
      // Kit fonts are git-ignored (run the kit's localize step); skip ones not on disk.
      const has = (f) => access(f).then(() => true, () => false);
      if (!(await has(to)) && (await has(file))) await copyFile(file, to);
    }
  };
  return { unrewriteHtml, route, copyFonts };
}
