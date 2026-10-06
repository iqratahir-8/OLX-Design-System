// OLX clickable prototype. Screens are screenshots captured from olx.com.pk;
// hotspots sit exactly over the links and buttons they were captured from and
// lead to the captured page or state a user would reach.
(() => {
  // Where captured files live relative to this page ("../" in the repo, "" in a flat publish).
  const ROOT = window.PROTO_ROOT ?? '../';
  const asset = (p) => (p.startsWith('../') ? ROOT + p.slice(3) : p);
  // Section HTML: one file each in the repo; a publish packs them into bundles.
  const bundles = new Map();
  async function sectionHtml(s, sec) {
    if (!s.bundle) return fetch(asset(sec.html)).then((r) => r.text());
    if (!bundles.has(s.bundle)) bundles.set(s.bundle, fetch(asset(s.bundle)).then((r) => r.json()));
    return (await bundles.get(s.bundle))[sec.html];
  }
  // A standalone document whose relative CSS links resolve from where its file lives.
  const withBase = (html, path) => html.replace(/<head>/i, `<head><base href="${new URL(asset(path).replace(/[^/]*$/, ''), location.href).href}">`);
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(`olx-proto-${k}`)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(`olx-proto-${k}`, JSON.stringify(v)); } catch { /* ignore */ } } };

  let data;
  const state = { id: 'home', vp: store.get('vp', 'desktop'), view: store.get('view', window.PROTO_DEFAULT_VIEW ?? 'shot'), flow: null, step: 0 };
  const history = [];

  const stage = $('pt-stage');
  const side = $('pt-side');
  const flowBar = $('pt-flow');
  const sectionsPanel = $('pt-sections');
  const hotToggle = $('pt-hotspots');
  hotToggle.checked = store.get('hot', false);

  const screen = (id = state.id, vp = state.vp) => data.pages[`${id}~${vp}`];
  const available = (id) => ['desktop', 'mobile'].filter((vp) => data.pages[`${id}~${vp}`]);

  // ---------- Routing: #<id>~<vp> or #flow~<flow>~<step>~<vp> ----------
  function hashFor() {
    return state.flow ? `flow~${state.flow}~${state.step}~${state.vp}` : `${state.id}~${state.vp}`;
  }
  function readHash() {
    const parts = location.hash.slice(1).split('~');
    if (parts[0] === 'flow' && data.flows.some((f) => f.id === parts[1])) {
      state.flow = parts[1]; state.step = Number(parts[2]) || 0; state.vp = parts[3] === 'mobile' ? 'mobile' : parts[3] === 'desktop' ? 'desktop' : state.vp;
      const f = data.flows.find((x) => x.id === state.flow);
      state.step = Math.min(state.step, f.steps.length - 1);
      state.id = f.steps[state.step].page;
    } else if (parts[0]) {
      state.flow = null;
      state.id = parts[0];
      if (parts[1] === 'desktop' || parts[1] === 'mobile') state.vp = parts[1];
    }
    if (!screen()) {
      const vps = available(state.id);
      if (vps.length) state.vp = vps[0];
      else state.id = 'home';
    }
  }
  function go(id, { push = true, keepFlow = false } = {}) {
    if (push) history.push({ id: state.id, vp: state.vp, flow: state.flow, step: state.step });
    if (!keepFlow) {
      // Leaving the flow's path ends the guided tour; following it advances it.
      const f = state.flow && data.flows.find((x) => x.id === state.flow);
      const nextIdx = f ? f.steps.findIndex((s, i) => i > state.step && s.page === id) : -1;
      if (f && nextIdx > -1) state.step = nextIdx;
      else state.flow = null;
    }
    state.id = id;
    if (!screen()) state.vp = available(id)[0] ?? state.vp;
    location.hash = hashFor();
  }
  function back() {
    const prev = history.pop();
    if (!prev) return;
    Object.assign(state, prev);
    location.hash = hashFor();
  }

  // ---------- Sidebar ----------
  function renderSide() {
    const vpHint = (id) => available(id).map((v) => (v === 'desktop' ? 'D' : 'M')).join(' ');
    let html = '<div class="pt-group"><p class="pt-group__title">Flows</p><ul>';
    for (const f of data.flows) {
      const current = state.flow === f.id;
      html += `<li><a class="pt-link" href="#flow~${f.id}~0~${state.vp}" ${current ? 'aria-current="true"' : ''}><span>${esc(f.title)}</span><span class="pt-link__hint">${f.steps.length} steps</span></a></li>`;
    }
    html += '</ul></div>';
    for (const g of data.groups) {
      html += `<div class="pt-group"><p class="pt-group__title">${esc(g.name)}</p><ul>`;
      for (const p of g.pages) {
        const current = !state.flow && state.id === p.id;
        const vp = available(p.id).includes(state.vp) ? state.vp : available(p.id)[0];
        html += `<li><a class="pt-link" href="#${p.id}~${vp}" ${current ? 'aria-current="true"' : ''}><span>${esc(p.title)}</span><span class="pt-link__hint">${vpHint(p.id)}</span></a></li>`;
      }
      html += '</ul></div>';
    }
    side.innerHTML = html;
  }

  // ---------- Flow banner ----------
  function renderFlow() {
    const f = state.flow && data.flows.find((x) => x.id === state.flow);
    flowBar.hidden = !f;
    if (!f) return;
    const s = f.steps[state.step];
    flowBar.innerHTML = `<span class="pt-flow__title">${esc(f.title)}</span>
      <span class="pt-flow__step">Step ${state.step + 1} of ${f.steps.length}</span>
      <span class="pt-flow__caption">${esc(s.caption)}${s.next ? ` Next: <strong>${esc(s.next)}</strong>.` : ''}</span>
      <span class="pt-flow__actions">
        <button class="pt-btn" type="button" data-flow="prev" ${state.step === 0 ? 'disabled' : ''}>Previous</button>
        <button class="pt-btn" type="button" data-flow="next" ${state.step === f.steps.length - 1 ? 'disabled' : ''}>Next step</button>
        <button class="pt-btn" type="button" data-flow="exit">Exit flow</button>
      </span>`;
  }
  flowBar.addEventListener('click', (e) => {
    const act = e.target.closest('[data-flow]')?.dataset.flow;
    const f = data.flows.find((x) => x.id === state.flow);
    if (!act || !f) return;
    if (act === 'exit') { state.flow = null; location.hash = hashFor(); return; }
    history.push({ id: state.id, vp: state.vp, flow: state.flow, step: state.step });
    state.step = Math.max(0, Math.min(f.steps.length - 1, state.step + (act === 'next' ? 1 : -1)));
    state.id = f.steps[state.step].page;
    if (!screen()) state.vp = available(state.id)[0] ?? state.vp;
    location.hash = hashFor();
  });

  // ---------- Stage ----------
  function renderStage() {
    const s = screen();
    stage.replaceChildren();
    if (!s) { stage.innerHTML = '<p class="pt-note">This screen was not captured for this device.</p>'; return; }
    const isMobile = s.vp === 'mobile';
    const avail = stage.clientWidth - 2 * parseFloat(getComputedStyle(stage).paddingLeft) - (isMobile ? 20 : 2);
    const width = isMobile ? Math.min(s.width, avail) : Math.min(s.width, avail);
    const scale = width / s.width;
    const device = document.createElement('div');
    device.className = `pt-device pt-device--${s.vp}`;
    device.style.width = `${width + (isMobile ? 20 : 0)}px`;
    const inner = document.createElement('div');
    inner.style.position = 'relative';
    inner.style.width = `${width}px`;
    inner.style.height = `${s.height * scale}px`;
    // Scrolled states are screenshots of one moment in the scroll; the HTML would open at the top.
    if (state.view === 'html' && !s.scrolled) {
      inner.style.overflow = 'hidden';
      inner.innerHTML = `<iframe class="pt-live" title="${esc(s.title)}, live HTML" scrolling="no" tabindex="-1" style="width:${s.width}px;height:${s.height}px;transform:scale(${scale})"></iframe>`;
      // A publish may pack page HTML into bundles (s.pageBundle), rendered in place.
      if (!s.pageBundle) inner.firstElementChild.src = asset(s.html);
      else {
        const frame = inner.firstElementChild;
        if (!bundles.has(s.pageBundle)) bundles.set(s.pageBundle, fetch(asset(s.pageBundle)).then((r) => r.json()));
        bundles.get(s.pageBundle).then((b) => { frame.srcdoc = withBase(b[s.html], s.html); });
      }
    } else {
      inner.innerHTML = `<img alt="${esc(s.title)} as captured from olx.com.pk" src="${asset(s.image)}" width="${Math.round(width)}" height="${Math.round(s.height * scale)}">`;
    }

    const f = state.flow && data.flows.find((x) => x.id === state.flow);
    const nextLabel = f?.steps[state.step]?.next?.toLowerCase();
    const nextPage = f?.steps[state.step + 1]?.page;
    let marked = false;
    // Largest first in the DOM, so smaller (inner) hotspots stack on top.
    for (const h of [...s.hotspots].reverse()) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pt-hot';
      b.style.left = `${h.x * scale}px`;
      b.style.top = `${h.y * scale}px`;
      b.style.width = `${Math.max(h.w * scale, 8)}px`;
      b.style.height = `${Math.max(h.h * scale, 8)}px`;
      const dest = h.external ? 'opens outside the prototype' : h.to === '@back' ? 'goes back' : `opens ${data.pages[`${h.to}~${s.vp}`]?.title ?? h.to}`;
      b.title = `${h.label || 'Link'}: ${dest}`;
      b.setAttribute('aria-label', b.title);
      if (h.external) b.classList.add('pt-hot--external');
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (h.external) { window.open(h.external, '_blank', 'noopener'); return; }
        if (h.to === '@back') { back(); return; }
        go(h.to);
      });
      inner.append(b);
    }
    // Point at the control the flow uses next (by its label, or by where it leads).
    if (f) {
      const cands = [...inner.querySelectorAll('.pt-hot')];
      const pick = (nextLabel && cands.find((b) => b.title.toLowerCase().startsWith(`${nextLabel}:`)))
        || (nextLabel && cands.find((b) => b.title.toLowerCase().includes(nextLabel)))
        || (nextPage && cands.find((b) => b.title.endsWith(`opens ${data.pages[`${nextPage}~${s.vp}`]?.title}`)));
      if (pick) { pick.classList.add('pt-hot--next'); marked = pick; }
    }
    // Clicking outside a hotspot briefly shows where the hotspots are.
    inner.addEventListener('click', () => { inner.classList.add('pt-flash'); setTimeout(() => inner.classList.remove('pt-flash'), 600); });
    inner.classList.toggle('pt-show-hot', hotToggle.checked);
    device.append(inner);
    stage.append(device);
    stage.scrollTop = 0;
    if (marked) requestAnimationFrame(() => marked.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    stage.dataset.scale = scale;
  }

  // ---------- Sections panel ----------
  function renderSections() {
    const s = screen();
    if (sectionsPanel.hidden || !s) return;
    let html = `<h2>${esc(s.title)}</h2><p>${s.sections.length} sections, ${s.vp}. Select one to find it on the screen.</p>`;
    // Thumbnails are cropped from the page screenshot, so no extra images load.
    const thumbW = 272;
    s.sections.forEach((sec, i) => {
      const k = thumbW / sec.width;
      const thumb = `<span class="pt-sec__thumb" style="height:${Math.min(120, Math.round(sec.height * k))}px;background-image:url('${asset(s.image)}');background-size:${s.width * k}px auto;background-position:${-sec.x * k}px ${-sec.y * k}px"></span>`;
      const files = `<button type="button" class="pt-linkbtn" data-sec-html="${i}">HTML</button>${s.bundle ? '' : `<a href="${asset(sec.image)}" target="_blank" rel="noopener">Image</a>`}`;
      html += `<div class="pt-sec"><button type="button" data-sec="${i}">${thumb}<span class="pt-sec__name">${i + 1}. ${esc(sec.name)}</span></button>
        <span class="pt-sec__meta"><span>${sec.width} × ${sec.height}</span>${files}</span></div>`;
    });
    sectionsPanel.innerHTML = html;
  }
  // ---------- Section HTML viewer ----------
  const modal = $('pt-modal');
  let modalHtml = '';
  async function showSection(i) {
    const s = screen();
    const sec = s.sections[i];
    modal.hidden = false;
    $('pt-modal-title').textContent = `${s.title}: ${sec.name} (${s.vp})`;
    const render = modal.querySelector('.pt-modal__render');
    const code = modal.querySelector('code');
    render.replaceChildren(); code.textContent = 'Loading…';
    try {
      modalHtml = await sectionHtml(s, sec);
      const k = Math.min(1, (render.clientWidth || 800) / sec.width);
      const box = document.createElement('div');
      box.style.cssText = `width:${sec.width * k}px;height:${sec.height * k}px;overflow:hidden;position:relative`;
      const f = document.createElement('iframe');
      f.title = `${sec.name}, live HTML`;
      f.style.cssText = `position:absolute;left:0;top:0;border:0;width:${sec.width}px;height:${sec.height}px;transform:scale(${k});transform-origin:0 0`;
      f.srcdoc = withBase(modalHtml, sec.html);
      box.append(f); render.append(box);
      code.textContent = modalHtml;
    } catch (err) { code.textContent = `Could not load this section (${err.message}).`; }
    modal.querySelector('[data-modal="close"]').focus();
  }
  modal.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-modal]')?.dataset.modal;
    if (e.target === modal || act === 'close') { modal.hidden = true; return; }
    if (act === 'copy') {
      const b = e.target.closest('button');
      try { await navigator.clipboard.writeText(modalHtml); b.textContent = 'Copied'; } catch { b.textContent = 'Select the code below'; }
      setTimeout(() => { b.textContent = 'Copy HTML'; }, 2000);
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) modal.hidden = true; });

  sectionsPanel.addEventListener('click', (e) => {
    const h = e.target.closest('[data-sec-html]')?.dataset.secHtml;
    if (h != null) { showSection(Number(h)); return; }
    const i = e.target.closest('[data-sec]')?.dataset.sec;
    if (i == null) return;
    const sec = screen().sections[Number(i)];
    const scale = Number(stage.dataset.scale) || 1;
    const inner = stage.querySelector('.pt-device > div');
    inner.querySelector('.pt-section-mark')?.remove();
    const mark = document.createElement('div');
    mark.className = 'pt-section-mark';
    Object.assign(mark.style, { left: `${sec.x * scale}px`, top: `${sec.y * scale}px`, width: `${sec.width * scale}px`, height: `${sec.height * scale}px` });
    inner.append(mark);
    mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => { mark.style.opacity = '0'; setTimeout(() => mark.remove(), 450); }, 1600);
  });

  // ---------- Chrome ----------
  function renderBar() {
    const s = screen();
    $('pt-screen').textContent = s ? `${s.title}` : 'Not captured';
    document.title = s ? `${s.title} · OLX Prototype` : 'OLX Prototype';
    document.querySelectorAll('.pt-seg [data-vp]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.vp === state.vp));
      b.disabled = !available(state.id).includes(b.dataset.vp);
    });
    $('pt-back').disabled = history.length === 0;
    document.querySelectorAll('.pt-seg [data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
    if (s) $('pt-book').href = `${window.PROTO_BOOK ?? '../book/'}#screen-${s.id}`;
  }
  function render() {
    readHash();
    store.set('vp', state.vp);
    renderBar(); renderSide(); renderFlow(); renderStage(); renderSections();
  }

  document.querySelectorAll('.pt-seg [data-vp]').forEach((b) => b.addEventListener('click', () => { state.vp = b.dataset.vp; location.hash = hashFor(); }));
  document.querySelectorAll('.pt-seg [data-view]').forEach((b) => b.addEventListener('click', () => { state.view = b.dataset.view; store.set('view', state.view); renderBar(); renderStage(); }));
  $('pt-back').addEventListener('click', back);
  hotToggle.addEventListener('change', () => { store.set('hot', hotToggle.checked); stage.querySelector('.pt-device > div')?.classList.toggle('pt-show-hot', hotToggle.checked); });
  $('pt-sections-toggle').addEventListener('click', (e) => {
    sectionsPanel.hidden = !sectionsPanel.hidden;
    e.currentTarget.setAttribute('aria-expanded', String(!sectionsPanel.hidden));
    renderSections();
    renderStage();
  });
  $('pt-menu').addEventListener('click', (e) => {
    const open = side.classList.toggle('is-open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
  });
  side.addEventListener('click', (e) => { if (e.target.closest('.pt-link')) { side.classList.remove('is-open'); $('pt-menu').setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea') || !modal.hidden) return;
    if (e.key === 'Backspace' || (e.key === 'ArrowLeft' && e.altKey)) { e.preventDefault(); back(); }
    if (e.key === 'h') { hotToggle.checked = !hotToggle.checked; hotToggle.dispatchEvent(new Event('change')); }
  });
  let lastW = 0;
  addEventListener('resize', () => { if (Math.abs(stage.clientWidth - lastW) > 30) { lastW = stage.clientWidth; renderStage(); } });
  addEventListener('hashchange', render);

  // data.json sits next to this page (prototype/data.json in the repo).
  fetch('data.json')
    .then((r) => r.json())
    .then((d) => { data = d; if (!location.hash) location.hash = `home~${state.vp}`; else render(); lastW = stage.clientWidth; })
    .catch((err) => { stage.innerHTML = `<p class="pt-note">Could not load the prototype data (${esc(err.message)}). Run <code>npm run prototype</code> and open it through a local server.</p>`; });
})();
