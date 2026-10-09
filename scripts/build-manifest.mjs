// Build design-system.json: one machine-readable index of the design system for
// Claude (the olx-design-system skill), Claude Design and other tools. Everything
// is read from the repo, so re-run this after changing tokens, CSS or captures.
//
//   node scripts/build-manifest.mjs     (npm run manifest)
//
// Paths are relative to the repo root; `urls` are the published copies.
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';

const read = async (f) => readFile(f, 'utf8');
const json = async (f) => JSON.parse(await read(f));
const BASE = 'https://iqratahir-8.github.io/OLX-Design-System';

// ---------- tokens: from the generated CSS, so names are exactly what code uses ----------
const tokensCss = await read('css/tokens.css');
function vars(block) {
  return Object.fromEntries([...block.matchAll(/(--olx-[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}
const rootBlock = tokensCss.match(/^:root\s*\{([\s\S]*?)^\}/m)?.[1] ?? '';
const darkBlock = tokensCss.match(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)^\}/m)?.[1] ?? '';
const light = vars(rootBlock), dark = vars(darkBlock);
const PRIMITIVE = /^--olx-(color|font|space|radius|shadow|motion|breakpoint|gradient)-/;
const groupOf = (name) => name.match(PRIMITIVE)?.[1] ?? 'semantic';
const tokens = {};
for (const [name, value] of Object.entries(light)) {
  const g = groupOf(name);
  (tokens[g] ??= []).push(dark[name] && dark[name] !== value ? { name, value, dark: dark[name] } : { name, value });
}

// ---------- CSS components: sections of components.css and the classes in each ----------
const componentsCss = await read('css/components.css');
const sections = [];
let current = null;
for (const line of componentsCss.split('\n')) {
  const head = line.match(/^\/\* -{3,} (.+?) -{3,} \*\//);
  if (head) { current = { name: head[1].replace(/:.*$/, '').trim(), note: head[1].includes(':') ? head[1].split(':').slice(1).join(':').trim() : undefined, classes: new Set() }; sections.push(current); continue; }
  if (current) for (const m of line.matchAll(/\.(olx-[\w-]+)/g)) current.classes.add(m[1]);
}
const cssComponents = sections.filter((s) => s.classes.size).map((s) => {
  const all = [...s.classes].sort();
  const blocks = all.filter((c) => !c.includes('--') && !c.includes('__'));
  return {
    name: s.name,
    ...(s.note ? { note: s.note } : {}),
    classes: blocks,
    modifiers: all.filter((c) => c.includes('--') && !c.includes('__')),
    elements: all.filter((c) => c.includes('__')),
  };
});

// ---------- React wrappers ----------
const reactDir = 'storybook/src/components';
const react = existsSync(reactDir)
  ? (await readdir(reactDir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => ({ name: e.name, dir: `${reactDir}/${e.name}` }))
  : [];

// ---------- live captures ----------
const liveComponents = {};
for (const c of (await json('components/index.json')).components) {
  const e = (liveComponents[c.name] ??= { name: c.name, page: c.page, captures: [] });
  // Most components have their own folder; some (with states such as "Scrolled") point
  // into a captured page's sections instead.
  e.captures.push({
    viewport: c.viewport,
    ...(c.state ? { state: c.state } : {}),
    html: c.markup ?? `components/${c.name}/${c.viewport}.html`,
    png: c.png ?? `components/${c.name}/${c.viewport}.png`,
    ...(c.frame ? { page: c.frame.html } : {}),
    width: c.width, height: c.height,
  });
}
const templates = {};
for (const t of (await json('templates/index.json')).templates) {
  const e = (templates[t.page] ??= { name: t.page, path: t.path, viewports: {} });
  e.viewports[t.viewport] = { html: `templates/${t.page}/${t.viewport}.html`, png: `templates/${t.page}/${t.viewport}.png`, width: t.width, height: t.height };
}
const site = await json('site/index.json');
const proto = await json('prototype/data.json');
const catalog = existsSync('catalog/index.json') ? await json('catalog/index.json') : null;
const assets = await json('assets/index.json');
const assetKinds = {};
for (const a of assets.assets) assetKinds[a.kind] = (assetKinds[a.kind] ?? 0) + 1;

let quality = null;
if (existsSync('audit/pixel-report.json')) {
  const r = await json('audit/pixel-report.json');
  quality = { report: 'audit/pixel-report.md', checked: r.checked, summary: {} };
  for (const x of r.results) { const g = (quality.summary[x.group] ??= {}); g[x.verdict] = (g[x.verdict] ?? 0) + 1; }
}

const manifest = {
  name: 'OLX Pakistan Design System',
  version: (await json('package.json')).version,
  generated: new Date().toISOString().slice(0, 10),
  source: { site: 'https://www.olx.com.pk', codebase: 'ZTechGroup/maple (private)' },
  urls: { book: `${BASE}/`, storybook: `${BASE}/storybook/`, prototype: `${BASE}/proto/`, showcase: `${BASE}/showcase/`, manifest: `${BASE}/design-system.json` },
  skill: '.claude/skills/olx-design-system/SKILL.md',
  usage: {
    css: 'css/olx.css',
    cssParts: ['css/tokens.css', 'css/base.css', 'css/components.css'],
    tokensJson: 'tokens/tokens.json',
    tokensJs: 'dist/tokens.js',
    theming: 'Light by default, follows prefers-color-scheme; force with <html data-theme="light|dark">. Components use semantic tokens (--olx-bg, --olx-text, --olx-primary, ...) only.',
    fonts: 'Geomanist (licensed, not in git; npm run fetch-fonts for local use). Fallback: Helvetica, Arial, sans-serif.',
    docs: ['README.md', 'docs/INTEGRATION.md', 'docs/FLOWS.md', 'PROGRESS.md'],
  },
  tokens: { source: 'tokens/tokens.json', css: 'css/tokens.css', count: Object.keys(light).length, groups: tokens },
  components: {
    css: cssComponents,
    react,
    live: Object.values(liveComponents),
  },
  templates: Object.values(templates),
  screens: {
    index: 'site/index.json',
    count: site.pages.length,
    pages: new Set(site.pages.map((p) => p.id)).size,
    layout: 'site/pages/<id>/<viewport>.{html,png,json} and site/pages/<id>/sections/<viewport>/NN-name.{html,png}',
    catalog: catalog ? 'catalog/index.json' : undefined,
  },
  flows: proto.flows.map((f) => ({ id: f.id, title: f.title, steps: f.steps.map((s) => s.page) })),
  prototype: { data: 'prototype/data.json', screens: Object.keys(proto.pages).length, url: `${BASE}/proto/` },
  assets: { index: 'assets/index.json', count: assets.assets.length, kinds: assetKinds },
  storybook: { dir: 'storybook', components: 'storybook/src/components', patterns: 'storybook/src/patterns', pages: 'storybook/design-kit/templates' },
  quality,
  gaps: [
    'Logged-in screens (post an ad, chat, profile, my ads) are not captured: templates/{chat,login,post-ad,profile} are empty. Run npm run capture:logged-in on a machine with an OLX login.',
    'Components not yet reconciled with the maple codebase (see docs/inventory.md).',
    'Some component captures need redoing; see audit/pixel-report.md.',
  ],
};

await writeFile('design-system.json', JSON.stringify(manifest, null, 1) + '\n');
console.log(`design-system.json: ${manifest.tokens.count} tokens, ${cssComponents.length} CSS components, ${react.length} React, ${manifest.components.live.length} live components, ${manifest.templates.length} templates, ${manifest.screens.count} screens, ${manifest.flows.length} flows`);
