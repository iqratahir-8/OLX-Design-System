// Download the web fonts referenced by the captured OLX templates into fonts/
// so the static copies render pixel-for-pixel. The files are committed (OLX holds the
// Geomanist licence); run this only if OLX changes them. Only Regular, Book and
// Medium are used: never add Geomanist Bold or Thin.
//
//   npm run fetch-fonts
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const urls = new Set();
for (const dir of await readdir('templates', { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  for (const file of await readdir(`templates/${dir.name}`)) {
    if (!file.endsWith('.html')) continue;
    const html = await readFile(`templates/${dir.name}/${file}`, 'utf8');
    for (const m of html.matchAll(/url\(["']?(https:\/\/www\.olx\.com\.pk\/[^"')]+\.woff2)/g)) urls.add(m[1]);
  }
}

await mkdir('fonts', { recursive: true });
for (const url of urls) {
  const name = url.split('/').pop();
  if (existsSync(`fonts/${name}`)) continue;
  const res = await fetch(url);
  if (!res.ok) { console.error(`failed ${url}: ${res.status}`); continue; }
  await writeFile(`fonts/${name}`, Buffer.from(await res.arrayBuffer()));
  console.log(`fonts/${name}`);
}
console.log(`${urls.size} font files referenced`);
