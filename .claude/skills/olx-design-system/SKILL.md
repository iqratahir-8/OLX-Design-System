---
name: olx-design-system
description: Use for any OLX Pakistan (olx.com.pk) design or front-end work — screens, components, flows, prototypes, copy, design QA or hand-off for OLX Classifieds, OLX Property or OLX Motors. Keeps colours, type, spacing and components consistent with the OLX design system in this repo (tokens, olx-* CSS components, live captures of every page). Use it before writing OLX UI code, designing an OLX screen in Claude Design or Figma, or reviewing whether something matches olx.com.pk.
---

# OLX Pakistan design system

This repo is the OLX Pakistan design system, built from the live site
(www.olx.com.pk) and checked against it. Everything is indexed in
**`design-system.json`** at the repo root (published at
https://iqratahir-8.github.io/OLX-Design-System/design-system.json). Read it first:
it lists every token, CSS component, live component capture, template, screen, flow
and asset, with file paths.

## Rules

1. **Look before you design.** OLX already has most screens. Find the live version first:
   - `design-system.json` → `screens`, `templates`, `flows`;
   - `catalog/index.json` for every page, section and flow;
   - `site/pages/<id>/<viewport>.png` for screenshots and `.html` for the real markup.

   Match it. Don't invent a new pattern when a live one exists.
2. **Tokens only.** Never hard-code a colour, size, radius, shadow or duration. Use the `--olx-*` CSS variables from `css/tokens.css`, or `dist/tokens.js` in JS.
   - In components, use **semantic** tokens (`--olx-text`, `--olx-primary`, `--olx-border`…), so dark mode works.
   - Use primitives (`--olx-color-petrol-900`…) only to define new semantic tokens.
3. **Components before custom CSS.** Use the `olx-*` classes in `css/components.css`. The class names, modifiers and elements are listed under `design-system.json` → `components.css`, and `index.html` shows each one.
   - **React:** use `storybook/src/components/` (Alert, Badge, Breadcrumb, Button, Chip, Field, ListingCard).
   - **Something missing?** Copy the live markup from `components/<name>/<viewport>.html` and restyle it with tokens.
4. **Desktop and mobile.** Every screen has both:
   - desktop is 1440 wide, content max 1280 (`.olx-container`);
   - mobile is 390 wide;
   - the main layout breakpoint is 767px (`@media (max-width: 767px)`);
   - token breakpoints are xs 360, sm 480, md 768, lg 950, xl 1280.
5. **Geomanist in three weights only.** Use Regular (400), Book (500) and Medium (600). **Never use Geomanist Bold or Thin**, and never `font-weight: 700`, `bold`, or anything under 400. For emphasis or headings use `--olx-font-weight-semibold` (600). `<strong>`/`<b>` already map to 600, and `font-synthesis: none` stops faked bold.
6. **Accessible by default.** Text contrast must be at least 4.5:1. Links and focus use `--olx-link` / `--olx-focus` (#2456d6), not the brand blue #3a77ff, which fails on white. Icon-only buttons need an `aria-label`. Respect `prefers-reduced-motion`.

## Quick reference

**Load everything:** `<link rel="stylesheet" href="css/olx.css">` (tokens + base + components).
For theming, the default follows the OS, and `<html data-theme="dark">` (or `"light"`) forces a theme.

**Brand colours**

| Colour | Hex | Used for |
| --- | --- | --- |
| Petrol | #002f34 | text, primary buttons, logo |
| Teal | #23e5db | accent |
| Yellow | #ffce32 | highlight, "Featured" |
| Blue | #3a77ff | brand icons only |
| Red | #ff5636 | |

The Sell button's tri-colour ring is `--olx-gradient-sell-ring`.

**Semantic tokens (light theme)**

| Token | Light value |
| --- | --- |
| `--olx-bg` / `--olx-bg-subtle` / `--olx-surface` | #fff / #f2f4f5 / #fff |
| `--olx-text` / `--olx-text-muted` / `--olx-text-inverse` | #002f34 / #406367 / #fff |
| `--olx-border` / `--olx-border-subtle` / `--olx-border-strong` | #d8dfe0 / #e8ecec / #002f34 |
| `--olx-primary` (hover `--olx-primary-hover`) / `--olx-on-primary` | #002f34 (#23494d) / #fff |
| `--olx-accent` / `--olx-highlight` / `--olx-featured` | #23e5db / #ffce32 / #00a49f |
| `--olx-link` / `--olx-focus` | #2456d6 |
| `--olx-success` / `--olx-warning` / `--olx-danger` (each with `-bg`) | #157544 / #002f34 / #b83018 |

**Type, spacing and shape**

| Group | Tokens |
| --- | --- |
| Font | `--olx-font-family-sans`: Geomanist (committed in `fonts/`, loaded by `css/tokens.css`), then Helvetica, Arial |
| Font size | `--olx-font-size-xs`…`4xl` = 12 / 14 / 16 / 18 / 20 / 24 / 32 / 40px |
| Font weight | `--olx-font-weight-regular` 400 (Geomanist Regular), `medium` 500 (Geomanist Book), `semibold` 600 (Geomanist Medium). These are the only three. |
| Line height | `--olx-font-line-height-tight` 1.2, `--olx-font-line-height-normal` 1.5 |
| Spacing | `--olx-space-1`…`8` = 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px |
| Radius | `--olx-radius-sm` 4, `field` 6, `md` 8, `lg` 16, `pill` 999 |
| Shadow | `--olx-shadow-sm`, `md`, `lg`, `featured` |
| Motion | `--olx-motion-duration-fast` 120ms, `base` 200ms, easing `--olx-motion-easing-standard` |

**Core markup** (copied from `index.html`):

```html
<button class="olx-btn olx-btn--primary">Chat</button>          <!-- --secondary --accent --ghost --danger, --sm, --block -->
<a class="olx-sell" href="/post"><span aria-hidden="true">+</span> Sell</a>

<div class="olx-field">                                         <!-- olx-field--error + aria-invalid on the input -->
  <label class="olx-label" for="title">Ad title</label>
  <input class="olx-input" id="title">
  <span class="olx-hint">Mention the key features of your item.</span>
</div>

<form class="olx-search" role="search">
  <label class="olx-visually-hidden" for="q">Search</label>
  <input id="q" type="search" placeholder="Find Cars, Mobile Phones and more...">
  <button type="submit">Search</button>
</form>

<div class="olx-alert olx-alert--info" role="status"><div><strong>Heads up</strong>Your ad is under review.</div></div>
```

Listing cards use `olx-listing` (variants `--featured` and `--row`) with these elements:
- `__media`, `__body`, `__head`;
- `__price` (or `olx-price olx-price--md`), `__title`, `__desc`, `__meta`;
- `__fav` (a button with `aria-pressed`), `__badge`, `__ribbon`.

`index.html` has a full example.

## OLX content conventions (as on the live site)

- **Prices:** "Rs 54,999" under 1 lakh; above that "Rs 9.75 Lac" (the live site also writes "Lacs", for example "Rs 71.50 Lacs"); above 1 crore "Rs 3.10 Crore".
- **Listing meta:** "Area, City · 3 days ago" (relative time: "5 minutes ago", "1 day ago").
- **Featured ads:** a yellow "Featured" badge; the weekly pick gets an "Ad of the Week" ribbon.
- **Personal data:** never put real seller names or phone numbers in designs or captures. Use "Seller name" and "03XX-XXXXXXX".

## Where to find things

| Need | File |
| --- | --- |
| Everything, indexed | `design-system.json` (rebuild: `npm run manifest`) |
| Tokens | `tokens/tokens.json` (rebuild CSS/JS: `npm run build`) |
| CSS | `css/olx.css` = `css/tokens.css` + `css/base.css` + `css/components.css` |
| A live page as HTML + screenshot | `site/pages/<id>/<desktop\|mobile>.{html,png,json}` |
| A page section | `site/pages/<id>/sections/<viewport>/NN-name.{html,png}` |
| A live component | `components/<name>/<viewport>.{html,png}`, or the section paths listed per state in `design-system.json` → `components.live` |
| Page templates | `templates/<page>/<viewport>.{html,png}` |
| User journeys | `design-system.json` → `flows`, `docs/FLOWS.md`, prototype `prototype/data.json` |
| Icons, category art, logos | `assets/` (`assets/index.json` lists where each is used) |
| Storybook stories | `storybook/src/` (published at `/storybook/`) |
| How it matches live | `audit/pixel-report.md` |
| Status and open gaps | `PROGRESS.md` |

## Checking your work

- **Compare with live.** Put your screen next to the matching `site/pages/<id>/<viewport>.png`. Check both viewports.
- **Re-run the pixel check** if you changed captured HTML or CSS: `MASK_PHOTOS=1 npm run verify:pixels`. It writes `audit/pixel-report.md`.
- **Refresh from live** only when OLX changes. This needs network access to www.olx.com.pk; see "How to work on it" in `PROGRESS.md`.

## Known gaps

Logged-in screens aren't captured yet: post an ad, chat, profile and my ads (`templates/{chat,login,post-ad,profile}` are empty). For those, follow the patterns of the nearest captured screens and say that you did. The full list is in `design-system.json` → `gaps`.
