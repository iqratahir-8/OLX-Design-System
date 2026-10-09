// OLX design system book. Reads the capture indexes and tokens, then renders
// pages for foundations, components and templates. Components are shown by
// cropping them out of their full-page template, which is verified against the
// live site, so the render matches olx.com.pk pixel for pixel.
(() => {
  // Where the repo root is relative to this page ("..", or "." in a flat publish).
  const ROOT = window.BOOK_ROOT ?? '..';
  const url = (p) => `${ROOT}/${p}`;
  // The prototype's folder ("prototype" in the repo; a publish may rename it).
  const PROTO = window.BOOK_PROTO_DIR ?? 'prototype';

  const GROUPS = [
    ['Header and navigation', ['header', 'top-bar', 'login-button', 'sell-button', 'search-row', 'search-bar', 'location-picker', 'category-nav', 'mobile-header', 'mobile-location-bar', 'breadcrumb']],
    ['Home', ['category-tiles', 'category-tile', 'listing-section', 'listing-card', 'app-banner']],
    ['Listings', ['page-title', 'filters-sidebar', 'categories-filter', 'brand-chips', 'listing-toolbar', 'listing-row-featured', 'delivery-card']],
    ['Ad detail', ['gallery', 'ad-overview', 'ad-details', 'ad-description', 'seller-sidebar', 'seller-card', 'seller-card-mobile', 'show-phone-button', 'chat-button', 'contact-bar', 'related-ads', 'safety-tips']],
    ['Footer', ['footer', 'copyright-bar']],
    ['Motors', ['motors-header', 'motors-mobile-header']],
  ];

  const ABOUT = {
    header: 'Desktop header: top bar and search row, and the sticky header an ad shows after scrolling.',
    'top-bar': 'Light blue brand strip with the logo tab, Motors and Property, Login and Sell.',
    'login-button': 'Underlined Login link in the top bar.',
    'sell-button': 'Pill button with the yellow, teal and blue ring.',
    'search-row': 'Location picker and search bar side by side.',
    'search-bar': 'Search input with the petrol Search button.',
    'location-picker': 'Location field with pin and chevron.',
    'category-nav': 'All categories menu and quick category links under the header.',
    'mobile-header': 'Mobile header in each of its states: at the top of the home page, compact after scrolling, on an ad after scrolling, and on a listing page.',
    'mobile-location-bar': 'Current location line on mobile.',
    breadcrumb: 'Path from Home to the current page.',
    'category-tiles': 'Home grid of category icons.',
    'category-tile': 'One category icon with its label.',
    'listing-section': 'Category row on the home page with its View more link.',
    'listing-card': 'Grid listing card: photo, price, title, location and date.',
    'app-banner': 'Download-the-app banner above the footer.',
    'page-title': 'Listing page heading with the result count.',
    'filters-sidebar': 'Left column of listing filters.',
    'categories-filter': 'Category tree filter.',
    'brand-chips': 'Scrollable row of brand filter chips.',
    'listing-toolbar': 'View switch and sort menu.',
    'listing-row-featured': 'Featured ad in list view with Call and Chat buttons.',
    'delivery-card': 'Card from the Buy with Delivery strip.',
    gallery: 'Ad photo gallery.',
    'ad-overview': 'Price, title, location and posting time.',
    'ad-details': 'Two-column table of ad attributes.',
    'ad-description': 'Seller-written description.',
    'seller-sidebar': 'Seller card with the contact buttons below it.',
    'seller-card': 'Posted by card with member-since and active-ads stats.',
    'seller-card-mobile': 'Seller block on mobile.',
    'show-phone-button': 'Primary contact button.',
    'chat-button': 'Secondary contact button.',
    'contact-bar': 'Call and Chat bar fixed to the bottom on mobile.',
    'related-ads': 'Carousel of related ads.',
    'safety-tips': 'Buyer safety tips.',
    footer: 'Link columns, social icons and the copyright bar.',
    'copyright-bar': 'Dark petrol bar at the very bottom.',
    'motors-header': 'Motors desktop header: the brand strip with Motors selected and the Motors section links, at the top and after scrolling.',
    'motors-mobile-header': 'Motors mobile header: the landing page header with its banner, and the back-and-title bar on car pages, at the top and after scrolling.',
  };

  const TEMPLATE_ABOUT = {
    home: 'Landing page: header, category tiles and category rows of listings.',
    'search-results': 'Results for a search query (iphone).',
    'category-listing': 'A category page (Mobile Phones) with filters and list view.',
    'ad-detail': 'One ad: gallery, details, description and the seller sidebar.',
    'location-prompt': 'First-visit mobile screen asking where to buy or sell.',
    'location-select': 'Mobile location chooser shown after Other address.',
  };

  const title = (slug) => slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const main = document.getElementById('book-main');
  const toc = document.getElementById('book-toc');
  // A copy published where olx.com.pk fonts and photos can't load opens on screenshots.
  const state = { viewport: 'desktop', tab: window.BOOK_DEFAULT_TAB ?? 'render' };
  try { Object.assign(state, JSON.parse(localStorage.getItem('olx-book') || '{}')); } catch { /* storage unavailable */ }
  const save = () => { try { localStorage.setItem('olx-book', JSON.stringify({ viewport: state.viewport, tab: state.tab })); } catch { /* ignore */ } };

  let data;

  async function load() {
    const [components, templates, tokens, proto, assets] = await Promise.all([
      fetch(url('components/index.json')).then((r) => r.json()),
      fetch(url('templates/index.json')).then((r) => r.json()),
      fetch(url('tokens/tokens.json')).then((r) => r.json()),
      // Every captured screen, with its sections, from the prototype build.
      fetch(url(`${PROTO}/data.json`)).then((r) => r.json()).catch(() => null),
      fetch(url('assets/index.json')).then((r) => r.json()).catch(() => null),
    ]);
    // A publish packs the asset files into one bundle of data URIs (file limits).
    if (assets && window.BOOK_ASSET_BUNDLE) assets.bundle = await fetch(url(window.BOOK_ASSET_BUNDLE)).then((r) => r.json()).catch(() => null);
    const byName = new Map();
    // A component can have several states per viewport (a header at the top of
    // the page and after scrolling); the first is its default.
    const states = new Map();
    for (const c of components.components) {
      if (!byName.has(c.name)) { byName.set(c.name, {}); states.set(c.name, {}); }
      byName.get(c.name)[c.viewport] ??= c;
      (states.get(c.name)[c.viewport] ??= []).push(c);
    }
    const tplByPage = new Map();
    for (const t of templates.templates) {
      if (!tplByPage.has(t.page)) tplByPage.set(t.page, {});
      tplByPage.get(t.page)[t.viewport] = t;
    }
    const grouped = GROUPS.map(([g, names]) => [g, names.filter((n) => byName.has(n))]);
    const listed = new Set(grouped.flatMap(([, n]) => n));
    const other = [...byName.keys()].filter((n) => !listed.has(n));
    if (other.length) grouped.push(['Other', other]);
    data = { components: byName, states, templates: tplByPage, tokens, grouped, source: components.source, captured: components.captured, proto, assets };
  }

  // ---------- Navigation ----------
  function renderToc(filter = '') {
    const f = filter.trim().toLowerCase();
    const link = (id, label, hint = '') => (!f || label.toLowerCase().includes(f) || id.includes(f))
      ? `<li><a class="book-link" href="#${id}" data-id="${id}"><span>${esc(label)}</span>${hint ? `<span class="book-link__hint">${hint}</span>` : ''}</a></li>` : '';
    const group = (name, items) => { const body = items.join(''); return body ? `<div class="book-group"><p class="book-group__title">${esc(name)}</p><ul>${body}</ul></div>` : ''; };
    const vpHint = (o) => Object.keys(o).map((v) => (v === 'desktop' ? 'D' : 'M')).join(' ');
    toc.innerHTML = [
      group('Start', [link('overview', 'Overview')]),
      group('Foundations', [link('foundations-color', 'Color'), link('foundations-type', 'Typography'), link('foundations-space', 'Spacing, radius and shadow')]),
      ...data.grouped.map(([g, names]) => group(g, names.map((n) => link(`component-${n}`, title(n), vpHint(data.components.get(n)))))),
      ...(data.assets ? [group('Assets', ASSET_KINDS.filter(([k]) => data.assets.assets.some((a) => a.kind === k)).map(([k, label]) => link(`assets-${k}`, label, String(data.assets.assets.filter((a) => a.kind === k).length))))] : []),
      group('Page templates', [...data.templates.keys()].map((p) => link(`template-${p}`, title(p), vpHint(data.templates.get(p))))),
      ...(window.BOOK_STORYBOOK_URL ? [group('Storybook', [`<li><a class="book-link" href="${esc(window.BOOK_STORYBOOK_URL)}" target="_blank" rel="noopener"><span>Open the Storybook</span><span class="book-link__hint">48 pages, 8 flows</span></a></li>`])] : []),
      ...(data.proto ? [
        group('Prototype', [`<li><a class="book-link" href="${url(`${PROTO}/index.html`)}"><span>Open the clickable prototype</span><span class="book-link__hint">${data.proto.flows.length} flows</span></a></li>`, link('screens', 'All screens', String(Object.keys(data.proto.pages).length))]),
        ...data.proto.groups.map((g) => group(`Screens: ${g.name}`, g.pages.map((pg) => link(`screen-${pg.id}`, pg.title, screenHint(pg.id))))),
      ] : []),
    ].join('');
    markCurrent();
  }
  const screenHint = (id) => ['desktop', 'mobile'].filter((v) => data.proto.pages[`${id}~${v}`]).map((v) => (v === 'desktop' ? 'D' : 'M')).join(' ');
  function markCurrent() {
    const id = location.hash.slice(1) || 'overview';
    toc.querySelectorAll('.book-link').forEach((a) => (a.dataset.id === id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  }

  // ---------- Live renders ----------
  // Show region (x, y, w, h) of a template, rendered at its capture width and full
  // height (the same state the pixel comparison used), scaled down to fit.
  function crop(tpl, rect, maxWidth) {
    const scale = Math.min(1, maxWidth / rect.width);
    const box = el(`<div class="book-crop" style="width:${rect.width * scale}px;height:${rect.height * scale}px"></div>`);
    const inner = el(`<div class="book-crop__inner" style="width:${rect.width}px;height:${rect.height}px;transform:scale(${scale})"></div>`);
    const frame = el(`<iframe loading="lazy" title="Live render" scrolling="no" tabindex="-1" style="left:${-rect.x}px;top:${-rect.y}px;width:${tpl.width}px;height:${tpl.height}px"></iframe>`);
    frame.src = url(tpl.html ?? `templates/${tpl.page}/${tpl.viewport}.html`);
    inner.append(frame);
    box.append(inner);
    snapToPixels(box);
    return box;
  }
  // A box that lands on a fractional position blurs thin text by half a pixel.
  function snapToPixels(node) {
    requestAnimationFrame(() => {
      node.style.transform = '';
      const r = node.getBoundingClientRect();
      const dx = r.left - Math.round(r.left), dy = r.top - Math.round(r.top);
      if (dx || dy) node.style.transform = `translate(${-dx}px, ${-dy}px)`;
    });
  }
  function fullPage(tpl, maxWidth) {
    const scale = Math.min(1, maxWidth / tpl.width);
    const wrap = el(`<div class="book-page-frame" style="width:${tpl.width * scale}px"></div>`);
    const sizer = el(`<div style="position:relative;width:${tpl.width * scale}px;height:${tpl.height * scale}px;overflow:hidden"></div>`);
    const frame = el(`<iframe title="${esc(title(tpl.page))} page" scrolling="no" style="position:absolute;left:0;top:0;border:0;width:${tpl.width}px;height:${tpl.height}px;transform:scale(${scale});transform-origin:0 0"></iframe>`);
    frame.src = url(`templates/${tpl.page}/${tpl.viewport}.html`);
    sizer.append(frame);
    wrap.append(sizer);
    return wrap;
  }
  // Width available inside .book-stage: the page column (capped by .book-page's
  // max-width) minus the stage's own padding and border.
  const stageWidth = () => {
    const cs = getComputedStyle(main);
    const column = main.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const cap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--book-page-max')) || 1180;
    const stagePad = innerWidth <= 860 ? 16 : 24;
    return Math.max(200, Math.floor(Math.min(column, cap) - 2 * stagePad - 2));
  };

  // Pull the component's own markup out of its standalone file (skipping the
  // ancestor wrappers that only carry class names) and indent it for reading.
  async function componentMarkup(c) {
    const html = await fetch(url(c.markup ?? `components/${c.name}/${c.viewport}.html`)).then((r) => r.text());
    const doc = new DOMParser().parseFromString(html, 'text/html');
    let node = doc.body.firstElementChild?.firstElementChild;
    while (node && node.children.length === 1 && (node.getAttribute('style') || '').includes('max-width:none;margin:0')) node = node.firstElementChild;
    return indent(node ? node.outerHTML : doc.body.innerHTML);
  }
  function indent(html) {
    let depth = 0;
    const voids = /^<(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr|path|circle|rect|line|polyline|polygon|use)\b/i;
    return html.replace(/>\s*</g, '>\n<').split('\n').map((line) => {
      if (/^<\//.test(line)) depth = Math.max(0, depth - 1);
      const out = '  '.repeat(depth) + line;
      if (/^<[^/!]/.test(line) && !voids.test(line) && !/\/>$/.test(line) && !/^<([a-z0-9-]+)\b[^>]*>.*<\/\1>$/i.test(line)) depth++;
      return out;
    }).join('\n');
  }

  function segmented(options, current, onPick, label) {
    const seg = el(`<div class="book-seg" role="group" aria-label="${esc(label)}"></div>`);
    for (const [value, text, disabled] of options) {
      const b = el(`<button type="button" aria-pressed="${value === current}">${esc(text)}</button>`);
      if (disabled) b.disabled = true;
      b.addEventListener('click', () => onPick(value));
      seg.append(b);
    }
    return seg;
  }

  // ---------- Pages ----------
  function page(eyebrow, heading, lede) {
    const p = el(`<article class="book-page"><p class="book-eyebrow">${esc(eyebrow)}</p><h1 class="book-title">${esc(heading)}</h1>${lede ? `<p class="book-lede">${lede}</p>` : ''}</article>`);
    return p;
  }

  function overview() {
    const p = page('OLX Pakistan', 'Design system book', `Every component and page template here is captured from <a href="${esc(data.source)}" target="_blank" rel="noopener">olx.com.pk</a> with its real markup and CSS, then checked pixel for pixel against the live site. Captured ${esc(data.captured)}.`);
    const nComp = data.components.size;
    const nCaps = [...data.states.values()].reduce((n, o) => n + Object.values(o).reduce((m, l) => m + l.length, 0), 0);
    const nTpl = [...data.templates.values()].reduce((n, o) => n + Object.keys(o).length, 0);
    p.append(el(`<div class="book-stats">
      <div class="book-stat"><span class="book-stat__value">${nComp}</span><span class="book-stat__label">Components</span></div>
      <div class="book-stat"><span class="book-stat__value">${nCaps}</span><span class="book-stat__label">Component captures</span></div>
      <div class="book-stat"><span class="book-stat__value">${data.templates.size}</span><span class="book-stat__label">Page templates</span></div>
      <div class="book-stat"><span class="book-stat__value">${nTpl}</span><span class="book-stat__label">Template captures</span></div>
      ${data.proto ? `<a class="book-stat" href="#screens"><span class="book-stat__value">${Object.keys(data.proto.pages).length}</span><span class="book-stat__label">Screens with HTML</span></a>
      ${data.assets ? `<a class="book-stat" href="#assets-icon"><span class="book-stat__value">${data.assets.assets.length}</span><span class="book-stat__label">Icons and assets</span></a>` : ''}
      <a class="book-stat" href="${url(`${PROTO}/index.html`)}"><span class="book-stat__value">${data.proto.flows.length}</span><span class="book-stat__label">Prototype flows</span></a>` : ''}
    </div>`));
    p.append(el(`<div class="book-note">
      <p><strong>How renders work.</strong> A component is shown by cropping it out of its full page template, so it keeps the exact layout it has on the site. Each one also has its live screenshot and its HTML.</p>
      <p><strong>Fonts.</strong> Geomanist is bundled in three weights only: Regular (400), Book (500) and Medium (600). Bold and Thin are not used.</p>
      <p><strong>Photos.</strong> Listing photos load from images.olx.com.pk. Where that host is blocked, cards show alt text.</p>
    </div>`));
    for (const [g, names] of data.grouped) {
      p.append(el(`<h2 class="book-h2">${esc(g)}</h2>`));
      const grid = el('<div class="book-grid"></div>');
      for (const n of names) {
        const caps = data.components.get(n);
        const vp = caps.desktop ? 'desktop' : 'mobile';
        grid.append(el(`<a class="book-card" href="#component-${n}">
          <span class="book-card__thumb"><img loading="lazy" alt="" src="${url(`components/${n}/${vp}.png`)}"></span>
          <span class="book-card__name">${esc(title(n))}</span>
          <p class="book-card__desc">${esc(ABOUT[n] ?? '')}</p></a>`));
      }
      p.append(grid);
    }
    p.append(el('<h2 class="book-h2">Page templates</h2>'));
    const grid = el('<div class="book-grid"></div>');
    for (const [pg, caps] of data.templates) {
      const vp = caps.desktop ? 'desktop' : 'mobile';
      grid.append(el(`<a class="book-card" href="#template-${pg}">
        <span class="book-card__thumb" style="place-items:start center"><img loading="lazy" alt="" src="${url(`templates/${pg}/${vp}.png`)}" style="max-height:none;width:100%"></span>
        <span class="book-card__name">${esc(title(pg))}</span>
        <p class="book-card__desc">${esc(TEMPLATE_ABOUT[pg] ?? '')}</p></a>`));
    }
    p.append(grid);
    return p;
  }

  function componentPage(name) {
    const caps = data.components.get(name);
    if (!caps) return notFound();
    if (!caps[state.viewport]) state.viewport = caps.desktop ? 'desktop' : 'mobile';
    if (state.component !== name) { state.component = name; state.stateIdx = 0; }
    const list = data.states.get(name)[state.viewport];
    const c = list[Math.min(state.stateIdx, list.length - 1)];
    const tpl = c.frame ?? data.templates.get(c.page)?.[c.viewport];
    const png = url(c.png ?? `components/${name}/${c.viewport}.png`);
    const group = data.grouped.find(([, n]) => n.includes(name))?.[0] ?? 'Component';
    const p = page(group, title(name), esc(ABOUT[name] ?? ''));
    p.append(el(`<ul class="book-meta">
      <li>Source <strong>${esc(title(c.page))}</strong> page</li>
      <li>Size <strong>${c.width} × ${c.height}px</strong> (${esc(c.viewport)})</li>
      <li>Markup <code>${esc(c.markup ?? `components/${name}/${c.viewport}.html`)}</code></li>
    </ul>`));
    const bar = el('<div class="book-toolbar"></div>');
    bar.append(segmented([['desktop', 'Desktop', !caps.desktop], ['mobile', 'Mobile', !caps.mobile]], state.viewport, (v) => { state.viewport = v; save(); route(); }, 'Viewport'));
    bar.append(segmented([['render', 'Live render'], ['shot', 'Screenshot'], ['html', 'HTML']], state.tab, (t) => { state.tab = t; save(); route(); }, 'View'));
    p.append(bar);
    if (list.length > 1) {
      const states = el('<div class="book-toolbar"></div>');
      states.append(segmented(list.map((x, i) => [i, x.state ?? `State ${i + 1}`]), Math.min(state.stateIdx, list.length - 1), (i) => { state.stateIdx = i; route(); }, 'State'));
      p.append(states);
    }

    if (state.tab === 'html') {
      const box = el('<div class="book-code"><pre><code>Loading markup…</code></pre></div>');
      const copy = el('<button class="book-btn" type="button">Copy HTML</button>');
      box.append(copy);
      componentMarkup(c).then((m) => {
        box.querySelector('code').textContent = m;
        copy.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(m); copy.textContent = 'Copied'; } catch {
            const range = document.createRange(); range.selectNodeContents(box.querySelector('code'));
            getSelection().removeAllRanges(); getSelection().addRange(range); copy.textContent = 'Selected, press Ctrl+C';
          }
          setTimeout(() => { copy.textContent = 'Copy HTML'; }, 2000);
        });
      }).catch(() => { box.querySelector('code').textContent = 'Could not load the markup file.'; });
      p.append(box);
    } else {
      const stage = el('<div class="book-stage"></div>');
      if (state.tab === 'shot') {
        stage.append(el(`<img class="book-shot" alt="${esc(title(name))} on olx.com.pk" src="${png}" style="width:${Math.min(c.width, stageWidth())}px">`));
        stage.append(el('<p class="book-stage__caption">Screenshot of the live element at capture time.</p>'));
      } else if (tpl && c.rect) {
        stage.append(crop(tpl, c.rect, stageWidth()));
        stage.append(el(`<p class="book-stage__caption">Rendered from <code>${esc(tpl.html ?? `templates/${c.page}/${c.viewport}.html`)}</code>${c.width > stageWidth() ? ', scaled to fit' : ''}.</p>`));
      } else {
        stage.append(el('<p class="book-stage__caption">No live render for this capture. Showing the screenshot instead.</p>'));
        stage.append(el(`<img class="book-shot" alt="" src="${png}">`));
      }
      p.append(stage);
    }
    return p;
  }

  function templatePage(pg) {
    const caps = data.templates.get(pg);
    if (!caps) return notFound();
    if (!caps[state.viewport]) state.viewport = caps.desktop ? 'desktop' : 'mobile';
    const t = caps[state.viewport];
    const p = page('Page template', title(pg), esc(TEMPLATE_ABOUT[pg] ?? ''));
    const used = [...data.components.entries()].filter(([, o]) => o[state.viewport]?.page === pg).map(([n]) => n);
    p.append(el(`<ul class="book-meta">
      <li>Live URL <strong>${esc(t.path || '/')}</strong></li>
      <li>Size <strong>${t.width} × ${t.height}px</strong> (${esc(t.viewport)})</li>
      <li>File <code>templates/${esc(pg)}/${esc(t.viewport)}.html</code></li>
    </ul>`));
    const bar = el('<div class="book-toolbar"></div>');
    bar.append(segmented([['desktop', 'Desktop', !caps.desktop], ['mobile', 'Mobile', !caps.mobile]], state.viewport, (v) => { state.viewport = v; save(); route(); }, 'Viewport'));
    const actions = el('<div class="book-actions"></div>');
    actions.append(el(`<a class="book-btn" href="${url(`templates/${pg}/${t.viewport}.html`)}" target="_blank" rel="noopener">Open page</a>`));
    actions.append(el(`<a class="book-btn" href="${url(`templates/${pg}/${t.viewport}.png`)}" target="_blank" rel="noopener">Open screenshot</a>`));
    bar.append(actions);
    p.append(bar);
    const stage = el('<div class="book-stage"></div>');
    stage.append(fullPage(t, stageWidth()));
    p.append(stage);
    if (used.length) {
      p.append(el('<h2 class="book-h2">Components on this page</h2>'));
      const grid = el('<div class="book-grid"></div>');
      for (const n of used) grid.append(el(`<a class="book-card" href="#component-${n}"><span class="book-card__thumb"><img loading="lazy" alt="" src="${url(`components/${n}/${state.viewport}.png`)}"></span><span class="book-card__name">${esc(title(n))}</span></a>`));
      p.append(grid);
    }
    return p;
  }

  // ---------- Assets (icons, illustrations and images from assets/index.json) ----------
  const ASSET_KINDS = [
    ['icon', 'Icons', 'SVG icons used inline in the pages, named after the label or text next to them.'],
    ['css-icon', 'CSS icons', 'Icons and shapes the stylesheets draw as background images (checkboxes, dropdown arrows, patterns).'],
    ['category', 'Category illustrations', 'The illustrations on the home page category tiles and in the category menu.'],
    ['illustration', 'Illustrations', 'Banners and illustrations.'],
    ['logo', 'Logos and badges', 'OLX, partner and sponsor logos.'],
    ['image', 'Images', 'Motors, Property and Sell tiles, header backgrounds and seasonal artwork.'],
  ];
  const assetSrc = (a) => data.assets.bundle?.[a.file] ?? url(a.file);
  function assetsPage(kind) {
    const meta = ASSET_KINDS.find(([k]) => k === kind);
    if (!meta) return notFound();
    const list = data.assets.assets.filter((a) => a.kind === kind);
    const p = page('Assets', meta[1], `${list.length} files in <code>assets/</code>. ${esc(meta[2])} Each one is stored separately, so it can be downloaded or copied on its own.`);
    const bar = el('<div class="book-toolbar"></div>');
    const bg = state.assetBg ?? 'light';
    bar.append(segmented([['light', 'Light'], ['dark', 'Dark'], ['check', 'Checkerboard']], bg, (v) => { state.assetBg = v; route(); }, 'Background'));
    const search = el('<input class="book-filter" type="search" placeholder="Filter by name" style="max-width:260px;margin:0">');
    bar.append(search);
    p.append(bar);
    const grid = el(`<div class="book-assets book-assets--${bg}"></div>`);
    for (const a of list) {
      const used = (a.usedOn ?? []).filter((u) => u !== 'css');
      const ids = [...new Set(used.map((u) => u.split('~')[0]))];
      const title = (data.proto && ids[0]) ? (data.proto.pages[used[0]]?.title ?? ids[0]) : '';
      const card = el(`<figure class="book-asset" data-name="${esc(a.name.toLowerCase())} ${esc(a.file.toLowerCase())}">
        <div class="book-asset__preview"><img loading="lazy" alt="${esc(a.name)}" src="${assetSrc(a)}"></div>
        <figcaption><strong>${esc(a.name)}</strong><code>${esc(a.file.replace('assets/', ''))}</code>
          ${a.sizes?.length ? `<span class="book-link__hint">${esc(a.sizes.slice(0, 3).join(', '))}px</span>` : ''}
          ${ids.length ? `<span class="book-link__hint">Used on ${ids.length} page${ids.length > 1 ? 's' : ''}${title ? `, e.g. <a href="#screen-${esc(ids[0])}">${esc(title)}</a>` : ''}</span>` : ''}
          ${a.selectors ? `<span class="book-link__hint">CSS <code>${esc(a.selectors.slice(0, 2).join(', '))}</code></span>` : ''}
          <span class="book-asset__actions"><a href="${assetSrc(a)}" download="${esc(a.file.split('/').pop())}">Download</a>${a.file.endsWith('.svg') ? '<button type="button" data-copy>Copy SVG</button>' : ''}</span>
        </figcaption></figure>`);
      card.querySelector('[data-copy]')?.addEventListener('click', async (e) => {
        const b = e.currentTarget;
        try { await navigator.clipboard.writeText(await fetch(assetSrc(a)).then((r) => r.text())); b.textContent = 'Copied'; } catch { b.textContent = 'Copy failed'; }
        setTimeout(() => { b.textContent = 'Copy SVG'; }, 1500);
      });
      grid.append(card);
    }
    search.addEventListener('input', () => { const f = search.value.trim().toLowerCase(); grid.querySelectorAll('.book-asset').forEach((c) => { c.hidden = !!f && !c.dataset.name.includes(f); }); });
    p.append(grid);
    return p;
  }

  // ---------- Screens (every captured page and state, from prototype/data.json) ----------
  // Paths in data.json are relative to prototype/ ("../site/..."); a publish may
  // point screenshots at uploaded assets and pack section HTML into bundles.
  const site = (p) => (p.startsWith('../') ? url(p.slice(3)) : p);
  const bundles = new Map();
  async function sectionHtml(s, sec) {
    if (!s.bundle) return fetch(site(sec.html)).then((r) => r.text());
    if (!bundles.has(s.bundle)) bundles.set(s.bundle, fetch(site(s.bundle)).then((r) => r.json()));
    return (await bundles.get(s.bundle))[sec.html];
  }
  const withBase = (html, path) => html.replace(/<head[^>]*>/i, (m) => `${m}<base href="${new URL(site(path).replace(/[^/]*$/, ''), location.href).href}">`);
  // Page HTML: a file, or (in a publish) an entry in a bundle of pages.
  async function pageHtml(s) {
    if (!s.pageBundle) return fetch(site(s.html)).then((r) => r.text());
    if (!bundles.has(s.pageBundle)) bundles.set(s.pageBundle, fetch(site(s.pageBundle)).then((r) => r.json()));
    return (await bundles.get(s.pageBundle))[s.html];
  }
  // Design-kit sections have no file of their own: cut them out of the page by selector.
  async function sectionDoc(s, sec) {
    if (sec.html) return sectionHtml(s, sec);
    const doc = new DOMParser().parseFromString(await pageHtml(s), 'text/html');
    const el = doc.querySelector(sec.selector);
    doc.body.innerHTML = `<div style="width:${sec.width}px">${el ? el.outerHTML : ''}</div>`;
    return `<!doctype html>\n${doc.documentElement.outerHTML}`;
  }
  // A live render of a screen (or a region of it), from its file or its bundle.
  function screenFrame(s, maxWidth, rect) {
    if (!s.pageBundle) return liveFrame(site(s.html), s.width, s.height, maxWidth, rect);
    const box = liveFrame('about:blank', s.width, s.height, maxWidth, rect);
    pageHtml(s).then((h) => { box.querySelector('iframe').srcdoc = withBase(h, s.html); });
    return box;
  }
  function codeBox(text) {
    const box = el('<div class="book-code"><pre><code></code></pre></div>');
    box.querySelector('code').textContent = text;
    const copy = el('<button class="book-btn" type="button">Copy HTML</button>');
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(text); copy.textContent = 'Copied'; } catch {
        const range = document.createRange(); range.selectNodeContents(box.querySelector('code'));
        getSelection().removeAllRanges(); getSelection().addRange(range); copy.textContent = 'Selected, press Ctrl+C';
      }
      setTimeout(() => { copy.textContent = 'Copy HTML'; }, 2000);
    });
    box.append(copy);
    return box;
  }
  function liveFrame(src, width, height, maxWidth, rect) {
    const r = rect ?? { x: 0, y: 0, width, height };
    const scale = Math.min(1, maxWidth / r.width);
    const box = el(`<div class="book-crop" style="width:${r.width * scale}px;height:${r.height * scale}px"></div>`);
    const inner = el(`<div class="book-crop__inner" style="width:${r.width}px;height:${r.height}px;transform:scale(${scale})"></div>`);
    const frame = el(`<iframe loading="lazy" title="Live render" scrolling="no" tabindex="-1" style="left:${-r.x}px;top:${-r.y}px;width:${width}px;height:${height}px"></iframe>`);
    // `src` is a URL, or a promise of HTML to render in place (bundled pages).
    if (typeof src === 'string') frame.src = src;
    else src.then((h) => { frame.srcdoc = h; });
    inner.append(frame); box.append(inner); snapToPixels(box);
    return box;
  }

  function screensIndex() {
    const pages = data.proto.pages;
    const p = page('Screens', 'All screens', `${Object.keys(pages).length} captures of ${new Set(Object.values(pages).map((x) => x.id)).size} pages and states from olx.com.pk. Each has its live HTML (the captured markup and CSS), a screenshot and its sections. Walk through them in the <a href="${url(`${PROTO}/index.html`)}">clickable prototype</a>.`);
    for (const g of data.proto.groups) {
      p.append(el(`<h2 class="book-h2">${esc(g.name)}</h2>`));
      const grid = el('<div class="book-grid"></div>');
      for (const pg of g.pages) {
        const s = pages[`${pg.id}~desktop`] ?? pages[`${pg.id}~mobile`];
        const k = 240 / s.width;
        const card = el(`<a class="book-card" href="#screen-${pg.id}">
          <span class="book-card__thumb" style="height:150px;${s.image ? `background:#fff url('${site(s.image)}') no-repeat 0 0/${s.width * k}px auto` : 'background:#fff;overflow:hidden;place-items:start'}"></span>
          <span class="book-card__name">${esc(pg.title)}</span>
          <p class="book-card__desc">${esc(screenHint(pg.id).replace('D', 'Desktop').replace('M', 'Mobile').replace(' ', ', '))} · ${s.sections.length} sections${s.image ? '' : ' · live HTML'}</p></a>`);
        // Design-kit pages have no screenshot: the thumbnail is the top of the live page.
        if (!s.image) card.querySelector('.book-card__thumb').append(screenFrame(s, 240, { x: 0, y: 0, width: s.width, height: Math.round(150 / k) }));
        grid.append(card);
      }
      p.append(grid);
    }
    return p;
  }

  function screenPage(id) {
    const pages = data.proto.pages;
    const vps = ['desktop', 'mobile'].filter((v) => pages[`${id}~${v}`]);
    if (!vps.length) return notFound();
    if (!vps.includes(state.viewport)) state.viewport = vps[0];
    const s = pages[`${id}~${state.viewport}`];
    const group = data.proto.groups.find((g) => g.pages.some((x) => x.id === id))?.name ?? 'Screen';
    const flows = data.proto.flows.filter((f) => f.steps.some((st) => st.page === id));
    const p = page(`Screens: ${group}`, s.title, `Captured from <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(new URL(s.url).pathname)}</a>.${s.scrolled ? ' This is a scrolled state, so the screenshot shows the moment after scrolling; the HTML opens at the top.' : ''}${s.overlay ? ' An overlay state: the menu, sheet or dialog is open.' : ''}`);
    p.append(el(`<ul class="book-meta">
      <li>Size <strong>${s.width} × ${s.height}px</strong> (${esc(s.vp)})</li>
      <li><strong>${s.sections.length}</strong> sections, <strong>${s.hotspots.length}</strong> links and buttons</li>
      <li>File <code>${esc(s.html.replace('../', ''))}</code></li>
    </ul>`));
    const bar = el('<div class="book-toolbar"></div>');
    bar.append(segmented([['desktop', 'Desktop', !vps.includes('desktop')], ['mobile', 'Mobile', !vps.includes('mobile')]], state.viewport, (v) => { state.viewport = v; save(); route(); }, 'Viewport'));
    const tab = !s.image && state.tab === 'shot' ? 'render' : state.tab;
    bar.append(segmented([['render', 'Live HTML'], ['shot', 'Screenshot', !s.image], ['html', 'HTML source']], tab, (t) => { state.tab = t; save(); route(); }, 'View'));
    const actions = el('<div class="book-actions"></div>');
    actions.append(el(`<a class="book-btn" href="${url(`${PROTO}/index.html`)}#${id}~${s.vp}">Open in prototype</a>`));
    if (s.pageBundle) {
      const dl = el('<button class="book-btn" type="button">Download HTML</button>');
      dl.addEventListener('click', async () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([await pageHtml(s)], { type: 'text/html' }));
        a.download = `${id}-${s.vp}.html`; a.click();
      });
      actions.append(dl);
    } else actions.append(el(`<a class="book-btn" href="${site(s.html)}" target="_blank" rel="noopener">Open HTML</a>`));
    bar.append(actions);
    p.append(bar);
    if (flows.length) p.append(el(`<p class="book-stage__caption">In flows: ${flows.map((f) => `<a href="${url(`${PROTO}/index.html`)}#flow~${f.id}~${f.steps.findIndex((st) => st.page === id)}~${s.vp}">${esc(f.title)}</a>`).join(', ')}</p>`));

    const max = stageWidth();
    if (tab === 'html') {
      const holder = el('<div><p class="book-stage__caption">Loading the page HTML…</p></div>');
      pageHtml(s).then((h) => holder.replaceChildren(codeBox(h))).catch(() => { holder.textContent = 'Could not load the HTML file.'; });
      p.append(holder);
    } else {
      const stage = el('<div class="book-stage"></div>');
      if (tab === 'shot') stage.append(el(`<img class="book-shot" alt="${esc(s.title)} on olx.com.pk" src="${site(s.image)}" style="width:${Math.min(s.width, max)}px">`));
      else stage.append(screenFrame(s, max));
      p.append(stage);
    }

    p.append(el('<h2 class="book-h2">Sections</h2>'));
    p.append(el('<p class="book-stage__caption">Each section has its own standalone HTML with the same CSS. Open one to see it rendered live and copy its markup.</p>'));
    const list = el('<div class="book-sections"></div>');
    s.sections.forEach((sec, i) => {
      const k = Math.min(1, 320 / sec.width);
      const item = el(`<details class="book-section">
        <summary>${s.image ? `<span class="book-section__thumb" style="width:${sec.width * k}px;height:${Math.min(160, sec.height * k)}px;background-image:url('${site(s.image)}');background-size:${s.width * k}px auto;background-position:${-sec.x * k}px ${-sec.y * k}px"></span>` : ''}
        <span><strong>${i + 1}. ${esc(sec.name)}</strong><br><span class="book-link__hint">${sec.width} × ${sec.height}px</span></span></summary>
        <div class="book-section__body"></div></details>`);
      item.addEventListener('toggle', async () => {
        const body = item.querySelector('.book-section__body');
        if (!item.open || body.childElementCount) return;
        body.append(el('<p class="book-stage__caption">Loading…</p>'));
        try {
          const html = await sectionDoc(s, sec);
          const w = Math.min(1, (body.clientWidth - 2 || max) / sec.width);
          const box = el(`<div class="book-crop" style="width:${sec.width * w}px;height:${sec.height * w}px"></div>`);
          const inner = el(`<div class="book-crop__inner" style="width:${sec.width}px;height:${sec.height}px;transform:scale(${w})"></div>`);
          const f = el(`<iframe title="${esc(sec.name)}, live HTML" scrolling="no" tabindex="-1" style="left:0;top:0;width:${sec.width}px;height:${sec.height}px"></iframe>`);
          f.srcdoc = withBase(html, sec.html ?? s.html);
          inner.append(f); box.append(inner);
          body.replaceChildren(box, codeBox(html));
        } catch (err) { body.replaceChildren(el(`<p class="book-stage__caption">Could not load this section (${esc(err.message)}).</p>`)); }
      });
      list.append(item);
    });
    p.append(list);
    return p;
  }

  // Foundations come from tokens/tokens.json, which holds the values measured on the live site.
  function resolveRef(v) {
    const m = typeof v === 'string' && v.match(/^\{(.+)\}$/);
    return m ? resolveRef(m[1].split('.').reduce((o, k) => o?.[k], data.tokens)) : v;
  }
  function colorPage() {
    const p = page('Foundations', 'Color', 'Palette measured from olx.com.pk. Components use the semantic names, which switch between light and dark themes.');
    p.append(el('<h2 class="book-h2">Palette</h2>'));
    const sw = el('<div class="book-swatches"></div>');
    for (const [fam, shades] of Object.entries(data.tokens.color)) {
      const entries = typeof shades === 'string' ? [[fam, shades]] : Object.entries(shades).map(([k, v]) => [`${fam}-${k}`, v]);
      for (const [n, v] of entries) sw.append(el(`<div class="book-swatch"><div class="book-swatch__chip" style="background:${esc(v)}"></div><div class="book-swatch__label"><strong>${esc(n)}</strong><code>${esc(v)}</code></div></div>`));
    }
    p.append(sw);
    p.append(el('<h2 class="book-h2">Semantic</h2>'));
    const wrap = el('<div class="book-table-wrap"><table class="book-table"><thead><tr><th>Token</th><th>Light</th><th>Dark</th></tr></thead><tbody></tbody></table></div>');
    const tb = wrap.querySelector('tbody');
    for (const [n, v] of Object.entries(data.tokens.semantic.light)) {
      const l = resolveRef(v); const d = resolveRef(data.tokens.semantic.dark[n]);
      const chip = (c) => `<span style="display:inline-block;width:16px;height:16px;vertical-align:-3px;margin-right:6px;border-radius:3px;border:1px solid var(--olx-border);background:${esc(c)}"></span><code>${esc(c)}</code>`;
      tb.append(el(`<tr><td><code>--olx-${esc(n)}</code></td><td>${chip(l)}</td><td>${d ? chip(d) : '—'}</td></tr>`));
    }
    p.append(wrap);
    return p;
  }
  function typePage() {
    const f = data.tokens.font;
    const p = page('Foundations', 'Typography', `Geomanist, with ${esc(f.family.sans.split(',').slice(1).join(',').trim())} as fallback. The site sets <code>html { font-size: 62.5% }</code>, so 1rem is 10px there. Body copy is 14px; the most used weight is 600. Only three Geomanist weights are used: Regular 400, Book 500 and Medium 600. Bold and Thin are not used.`);
    const wrap = el('<div class="book-table-wrap"><table class="book-table"><thead><tr><th>Token</th><th>Size</th><th>Sample</th></tr></thead><tbody></tbody></table></div>');
    for (const [n, v] of Object.entries(f.size).reverse()) wrap.querySelector('tbody').append(el(`<tr><td><code>font-size-${esc(n)}</code></td><td>${esc(v)}</td><td style="font-size:${esc(v)};line-height:1.25">Mobile Phones in Pakistan</td></tr>`));
    p.append(wrap);
    p.append(el('<h2 class="book-h2">Weights</h2>'));
    const w = el('<div class="book-table-wrap"><table class="book-table"><tbody></tbody></table></div>');
    const face = { 400: 'Geomanist Regular', 500: 'Geomanist Book', 600: 'Geomanist Medium' };
    for (const [n, v] of Object.entries(f.weight)) w.querySelector('tbody').append(el(`<tr><td><code>font-weight-${esc(n)}</code></td><td>${esc(v)} · ${esc(face[v] ?? '')}</td><td style="font-weight:${esc(v)};font-size:18px">Rs 4.75 Lac</td></tr>`));
    p.append(w);
    return p;
  }
  function spacePage() {
    const t = data.tokens;
    const p = page('Foundations', 'Spacing, radius and shadow', 'Scales used across the captured components.');
    const table = (head, rows) => { const w = el(`<div class="book-table-wrap"><table class="book-table"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody></tbody></table></div>`); rows.forEach((r) => w.querySelector('tbody').append(el(`<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`))); return w; };
    p.append(el('<h2 class="book-h2">Spacing</h2>'));
    p.append(table(['Token', 'Value', ''], Object.entries(t.space).map(([n, v]) => [`<code>space-${esc(n)}</code>`, esc(v), `<div class="book-bar" style="width:${esc(v)}"></div>`])));
    p.append(el('<h2 class="book-h2">Radius</h2>'));
    p.append(table(['Token', 'Value', ''], Object.entries(t.radius).map(([n, v]) => [`<code>radius-${esc(n)}</code>`, esc(v), `<div class="book-box" style="border-radius:${esc(v)}"></div>`])));
    p.append(el('<h2 class="book-h2">Shadow</h2>'));
    p.append(table(['Token', 'Value', ''], Object.entries(t.shadow).map(([n, v]) => [`<code>shadow-${esc(n)}</code>`, `<code>${esc(v)}</code>`, `<div class="book-box" style="border:0;box-shadow:${esc(v)}"></div>`])));
    p.append(el('<h2 class="book-h2">Breakpoints</h2>'));
    p.append(table(['Token', 'Width'], Object.entries(t.breakpoint).map(([n, v]) => [`<code>${esc(n)}</code>`, esc(v)])));
    return p;
  }
  function notFound() { return page('Not found', 'Nothing here', 'Pick a page from the contents.'); }

  function route() {
    const id = location.hash.slice(1) || 'overview';
    let view;
    if (id === 'overview') view = overview();
    else if (id === 'foundations-color') view = colorPage();
    else if (id === 'foundations-type') view = typePage();
    else if (id === 'foundations-space') view = spacePage();
    else if (id.startsWith('component-')) view = componentPage(id.slice(10));
    else if (id.startsWith('template-')) view = templatePage(id.slice(9));
    else if (id === 'screens' && data.proto) view = screensIndex();
    else if (id.startsWith('assets-') && data.assets) view = assetsPage(id.slice(7));
    else if (id.startsWith('screen-') && data.proto) view = screenPage(id.slice(7));
    else view = notFound();
    main.replaceChildren(view);
    markCurrent();
  }

  let lastWidth = 0;
  addEventListener('resize', () => { if (Math.abs(main.clientWidth - lastWidth) > 40) { lastWidth = main.clientWidth; route(); } });
  addEventListener('hashchange', () => { route(); main.focus({ preventScroll: true }); scrollTo(0, 0); });
  document.getElementById('book-filter').addEventListener('input', (e) => renderToc(e.target.value));
  // On narrow screens the contents sit behind a button and close after picking a page.
  const menu = document.getElementById('book-menu');
  menu.addEventListener('click', () => menu.setAttribute('aria-expanded', String(menu.getAttribute('aria-expanded') !== 'true')));
  toc.addEventListener('click', (e) => { if (e.target.closest('.book-link')) menu.setAttribute('aria-expanded', 'false'); });

  load().then(() => { renderToc(); lastWidth = main.clientWidth; route(); })
    .catch((err) => { main.replaceChildren(el(`<p class="book-loading">Could not load the capture data (${esc(err.message)}). Serve the repo root, for example with <code>npm run book</code>.</p>`)); });
})();
