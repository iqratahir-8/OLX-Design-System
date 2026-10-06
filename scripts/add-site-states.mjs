// Add component states that only exist in the site captures (headers after
// scrolling, the listing-page header) to components/index.json, so the design
// system book can show every state of a component side by side.
//
//   node scripts/add-site-states.mjs
import { readFile, writeFile } from 'node:fs/promises';

// [component, viewport, state label, site page id, section name]
const STATES = [
  ['mobile-header', 'mobile', 'Scrolled (compact)', 'home-scrolled', 'Header (scrolled)'],
  ['mobile-header', 'mobile', 'On an ad, scrolled', 'ad-scrolled', 'Header (scrolled)'],
  ['mobile-header', 'mobile', 'On a listing page', 'sub-mobile-phones', 'Header'],
  ['header', 'desktop', 'On an ad, scrolled', 'ad-scrolled', 'Sticky ad info header'],
];
// Label for the state each component already has from snapshot-live.
const DEFAULT_STATE = { 'mobile-header': 'At the top', header: 'Default' };

const index = JSON.parse(await readFile('components/index.json', 'utf8'));
index.components = index.components.filter((c) => !c.frame);
for (const c of index.components) if (DEFAULT_STATE[c.name]) c.state = DEFAULT_STATE[c.name];

for (const [name, vp, state, pageId, sectionName] of STATES) {
  let meta;
  try { meta = JSON.parse(await readFile(`site/pages/${pageId}/${vp}.json`, 'utf8')); } catch { console.error(`skip ${name} (${state}): site/pages/${pageId}/${vp}.json not captured`); continue; }
  const sec = meta.sections.find((s) => s.name === sectionName);
  if (!sec) { console.error(`skip ${name} (${state}): no "${sectionName}" section in ${pageId}/${vp}`); continue; }
  const base = `site/pages/${pageId}`;
  index.components.push({
    name, page: pageId, viewport: vp, state,
    width: sec.rect.width, height: sec.rect.height, rect: sec.rect,
    // Where the book renders it from, and its screenshot and markup.
    frame: { html: `${base}/${vp}.html`, width: meta.width, height: meta.height },
    png: `${base}/sections/${vp}/${sec.file}.png`,
    markup: `${base}/sections/${vp}/${sec.file}.html`,
  });
}
index.components.sort((a, b) => a.name.localeCompare(b.name) || a.viewport.localeCompare(b.viewport) || (a.frame ? 1 : 0) - (b.frame ? 1 : 0));
await writeFile('components/index.json', JSON.stringify(index, null, 2) + '\n');
console.log(`components/index.json: ${index.components.filter((c) => c.state).length} state entries`);
