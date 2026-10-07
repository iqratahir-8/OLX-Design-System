// One-off repair for captures taken before capture-lib copied lazy image URLs:
// give every <img data-src> without a src its src (and data-srcset its srcset),
// so stored pages, sections, templates and components show their photos.
//
//   node scripts/fix-lazy-images.mjs
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function* htmlFiles(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (p.endsWith('.html')) yield p;
  }
}

let files = 0, images = 0;
for (const root of ['site/pages', 'templates', 'components', 'storybook/design-kit/templates']) {
  try { await readdir(root); } catch { continue; }
  for await (const file of htmlFiles(root)) {
    const html = await readFile(file, 'utf8');
    let n = 0;
    const out = html.replace(/<(img|source)\b[^>]*>/g, (tag) => {
      let t = tag;
      const ds = t.match(/\sdata-src="([^"]+)"/)?.[1];
      if (ds && !/\ssrc="[^"]+"/.test(t)) { t = t.replace(/\ssrc=""/, '').replace(/^<(img|source)/, `<$1 src="${ds}"`); }
      const dss = t.match(/\sdata-srcset="([^"]+)"/)?.[1];
      if (dss && !/\ssrcset="[^"]+"/.test(t)) { t = t.replace(/\ssrcset=""/, '').replace(/^<(img|source)/, `<$1 srcset="${dss}"`); }
      if (t !== tag) n++;
      return t;
    });
    if (n) { await writeFile(file, out); files++; images += n; }
  }
}
console.log(`${images} lazy images given a src in ${files} files`);
