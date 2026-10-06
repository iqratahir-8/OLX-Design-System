// Shared pieces for capturing olx.com.pk as static HTML (used by
// snapshot-live.mjs and capture-site.mjs).
import { PNG } from 'pngjs';

// Remove interactive/ads/tracking noise and anything personal, make every URL absolute,
// and inline stylesheets. Runs in the page; returns the cleaned full-page HTML.
export function freezePage(origin) {
  const abs = (u) => { try { return new URL(u, location.href).href; } catch { return u; } };
  const absCss = (css) => css.replace(/url\((['"]?)(?!data:|https?:|#)([^'")]+)\1\)/g, (_, q, u) => `url(${q}${abs(u)}${q})`);

  // Scripts, ad slots and third-party frames do nothing in a static copy.
  document.querySelectorAll('script, iframe, noscript, link[rel="preload"], link[rel="prefetch"], link[rel="modulepreload"], link[rel="dns-prefetch"], link[rel="preconnect"]').forEach((e) => e.remove());
  // OLX's "Your notifications are off" tooltip.
  const note = [...document.querySelectorAll('h2')].find((e) => /notifications are off/i.test(e.textContent));
  for (let e = note; e && e !== document.body; e = e.parentElement) {
    const p = getComputedStyle(e).position;
    if (p === 'fixed' || p === 'absolute') { e.remove(); break; }
  }

  // Personal data: seller names/photos and phone numbers typed into ads.
  document.querySelectorAll('[aria-label="User photo"]').forEach((img) => { img.removeAttribute('src'); img.removeAttribute('srcset'); });
  // Seller names follow a "Posted by" label (seller card, sticky ad header, ...).
  for (const label of [...document.body.querySelectorAll('*')].filter((e) => e.children.length === 0 && /^Posted by$/i.test(e.textContent.trim()))) {
    // "Posted by" is also a tab next to "Related ads" on ad pages; leave tabs alone.
    const tab = label.closest('button, [role="tab"]');
    if (tab && tab.parentElement && tab.parentElement.querySelectorAll('button, [role="tab"]').length > 1) continue;
    const name = label.nextElementSibling ?? label.parentElement?.nextElementSibling;
    if (name && name.textContent.trim()) name.textContent = 'Seller name';
  }
  // Reviewer names on Motors reviews: "Posted by <b>name</b>, Jan 26, 2023" and
  // "by <b>"name"</b> for Toyota Corolla" (React leaves comment nodes in between).
  const byWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = byWalker.nextNode());) {
    if (!/(^|\bPosted )by\s*$/i.test(n.nodeValue) || !/^\s*(Posted )?by\s*$/i.test(n.nodeValue)) continue;
    let name = n.nextSibling;
    while (name && (name.nodeType === 8 || (name.nodeType === 3 && !name.nodeValue.trim()))) name = name.nextSibling;
    if (name?.nodeType === 1 && name.textContent.trim() && !/^(Seller name|OLX User)$/.test(name.textContent.trim())) name.textContent = 'User name';
  }
  // Phone numbers in ad titles and text (also in title/alt/aria-label attributes).
  const phone = /(\+?92[\s-]?|\b0)3\d{2}[\s-]?\d{7}\b|\b\d{4}[\s-]\d{7}\b/g;
  const email = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
  const redact = (v) => v.replace(phone, '03XX-XXXXXXX').replace(email, 'email@example.com');
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) { const v = redact(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
  for (const el of document.body.querySelectorAll('*')) {
    for (const attr of [...el.attributes]) {
      if (['src', 'srcset', 'href', 'style', 'class'].includes(attr.name)) continue;
      const v = redact(attr.value);
      if (v !== attr.value) el.setAttribute(attr.name, v);
    }
  }

  // Absolute URLs everywhere so the copy renders from any location.
  for (const el of document.querySelectorAll('[src], [href], [srcset], [poster]')) {
    for (const a of ['src', 'href', 'poster']) if (el.hasAttribute(a) && !el.getAttribute(a).startsWith('data:')) el.setAttribute(a, abs(el.getAttribute(a)));
    if (el.hasAttribute('srcset')) el.setAttribute('srcset', el.getAttribute('srcset').split(',').map((s) => { const [u, d] = s.trim().split(/\s+/); return [abs(u), d].filter(Boolean).join(' '); }).join(', '));
  }
  document.querySelectorAll('[style]').forEach((el) => el.setAttribute('style', absCss(el.getAttribute('style'))));
  document.querySelectorAll('style').forEach((s) => { s.textContent = absCss(s.textContent); });
  // Links become inert: the copy is for looking at, not navigating.
  document.querySelectorAll('a[href]').forEach((a) => a.setAttribute('href', '#'));
  document.querySelectorAll('form[action]').forEach((f) => f.removeAttribute('action'));
  return origin;
}

export async function inlineStylesheets(page) {
  return page.evaluate(async () => {
    const abs = (u, base) => { try { return new URL(u, base).href; } catch { return u; } };
    for (const link of [...document.querySelectorAll('link[rel="stylesheet"]')]) {
      try {
        const res = await fetch(link.href);
        if (!res.ok) continue;
        const css = (await res.text()).replace(/url\((['"]?)(?!data:|https?:|#)([^'")]+)\1\)/g, (_, q, u) => `url(${q}${abs(u, link.href)}${q})`);
        const style = document.createElement('style');
        style.dataset.from = link.href;
        style.textContent = css;
        link.replaceWith(style);
      } catch { /* cross-origin sheet: keep the <link> */ }
    }
  });
}

// Prefer locally fetched fonts (git-ignored) so the copy matches pixel for pixel.
export async function fontOverrides(page, fontsDir = '../../fonts') {
  const faces = await page.evaluate(() => [...document.querySelectorAll('style')]
    .flatMap((s) => s.textContent.match(/@font-face\s*\{[^}]*\}/g) ?? []));
  const seen = new Set();
  return faces.map((face) => {
    const file = face.match(/url\(["']?[^"')]*\/([^/"')]+\.woff2)/)?.[1];
    if (!file || seen.has(face)) return '';
    seen.add(face);
    return face.replace(/src:[^;}]+/, (src) => `src:url("${fontsDir}/${file}") format("woff2"),${src.slice(4)}`);
  }).join('\n');
}

export function cropPng(buffer, { x, y, width, height }, dpr) {
  const src = PNG.sync.read(buffer);
  const sx = Math.max(0, x * dpr), sy = Math.max(0, y * dpr);
  const w = Math.min(width * dpr, src.width - sx), h = Math.min(height * dpr, src.height - sy);
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(src, out, sx, sy, w, h, 0, 0);
  return PNG.sync.write(out);
}

export const docShell = ({ title, htmlAttrs, bodyAttrs, head, body }) => `<!doctype html>
<html ${htmlAttrs}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${head}
</head>
<body ${bodyAttrs}>
${body}
</body>
</html>
`;

// Scroll through the page so lazy images and sections render, then back to the top.
export async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 200)); }
    scrollTo(0, 0);
  });
}

// Lay the page out at its full height (what a full-page screenshot does) so
// everything can be measured in one state: fixed and sticky elements sit where a
// static render puts them, and nothing is scrolled. Returns the page size.
export async function layoutFullHeight(page) {
  const contentHeight = () => page.evaluate(() => {
    scrollTo(0, 0);
    document.querySelectorAll('*').forEach((e) => { if (e.scrollTop) e.scrollTop = 0; });
    let bottom = document.documentElement.scrollHeight;
    for (const e of document.body.querySelectorAll('*')) bottom = Math.max(bottom, e.getBoundingClientRect().bottom);
    return Math.ceil(bottom);
  });
  const { width } = page.viewportSize();
  let height = await contentHeight();
  for (let i = 0; i < 3; i++) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(400);
    const h = await contentHeight();
    if (h === height) break;
    height = h;
  }
  return { width, height };
}

// Document-level pieces needed to write the page back out.
export function pageParts(page) {
  return page.evaluate(() => {
    const attrs = (el) => [...el.attributes].map((a) => `${a.name}="${a.value.replace(/"/g, '&quot;')}"`).join(' ');
    return {
      title: document.title.replace(/</g, '&lt;'),
      htmlAttrs: attrs(document.documentElement),
      bodyAttrs: attrs(document.body),
      styles: [...document.head.querySelectorAll('style, link[rel="stylesheet"]')].map((s) => s.outerHTML).join('\n'),
      styleBlocks: [...document.head.querySelectorAll('style')].map((s) => (s.media ? `@media ${s.media} {\n${s.textContent}\n}` : s.textContent)),
      css: [...document.head.querySelectorAll('style')].map((s) => (s.media ? `@media ${s.media} {\n${s.textContent}\n}` : s.textContent)).join('\n'),
      links: [...document.head.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.outerHTML).join('\n'),
      body: document.body.innerHTML,
    };
  });
}
