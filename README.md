# OLX-Design-System

Design tokens, base styles and framework-agnostic CSS components for OLX interfaces, with light and dark themes.

## Structure

```
tokens/tokens.json        Source of truth: colors, semantic theme colors, type, spacing, radius, shadow, motion
scripts/build-tokens.mjs  Generates css/tokens.css and dist/tokens.js from tokens.json
css/tokens.css            Generated --olx-* CSS custom properties (light + dark)
css/base.css              Reset, typography, focus styles, utilities
css/components.css        Components (buttons, fields, search, badges, chips, cards, alerts, header, layout,
                          plus the live-measured navigation, listing-page, ad-detail and footer components)
css/olx.css               Single entry point that imports all of the above
dist/tokens.js            Generated JS export of the resolved tokens
index.html                Live documentation / component showcase
book/                     Design system book: browse foundations, components and page templates
prototype/                Clickable prototype of olx.com.pk built from site/ (flows, screens, sections)
site/pages/<id>/          Every captured page and state: <viewport>.html/.png/.json + sections/<viewport>/NN-name.png|html
site/css/                 Stylesheets shared by the captured pages (one file per unique block)
templates/<page>/         Live page templates: <viewport>.html (static, pixel-checked) + <viewport>.png
components/<name>/        Live components: <viewport>.html (markup) + <viewport>.png; index.json lists them
components/_css/          Shared CSS per captured page, linked by the component files
audit/live-snapshots/     Captures from https://www.olx.com.pk/
audit/maple-snapshots/    Captures from the local maple repo
audit/comparisons/        Live vs maple diff notes
scripts/snapshot-live.mjs Captures templates/ and components/ from olx.com.pk
scripts/capture-site.mjs  Captures the whole site into site/: pages, interaction states, sections, hotspots
scripts/import-motors.mjs  Imports Motors pages saved by the design kit (local-build branch) into site/
scripts/capture-logged-in.mjs  Run locally: you log in, then capture logged-in screens into site/
scripts/build-prototype.mjs  Wires captured links/buttons to captured screens -> prototype/data.json
scripts/lib/capture-lib.mjs  Shared capture code (clean-up, redaction, CSS inlining, layout, cropping)
scripts/fetch-fonts.mjs   Downloads the site fonts into fonts/ (git-ignored, licensed) for exact rendering
scripts/capture.mjs       Playwright capture (screenshot, HTML, computed styles)
scripts/inspect-components.mjs  Computed styles of key live components -> audit/live-snapshots/components.json
docs/inventory.md         Template/component checklist and status
```

## Usage

```html
<link rel="stylesheet" href="css/olx.css">

<button class="olx-btn olx-btn--primary">Post ad</button>
```

In JavaScript:

```js
import { tokens } from 'olx-design-system';
tokens.color.petrol['900']; // "#002f34"
```

### Theming

Semantic tokens (`--olx-bg`, `--olx-text`, `--olx-primary`, `--olx-danger`, …) follow the OS color scheme automatically. To force a theme, set `data-theme="light"` or `data-theme="dark"` on `<html>`.

Components use semantic tokens only; use primitives (`--olx-color-petrol-900`, …) when defining new semantic tokens, not directly in components.

## Components

| Component | Classes |
| --- | --- |
| Button | `olx-btn` + `--primary` / `--secondary` / `--accent` / `--ghost` / `--danger`, `--sm`, `--block` |
| Form field | `olx-field` (`--error`), `olx-label`, `olx-input`, `olx-select`, `olx-textarea`, `olx-hint`, `olx-check` |
| Search bar | `olx-search` |
| Badge | `olx-badge` + `--featured` / `--accent` / `--info` / `--success` / `--danger` |
| Chip | `olx-chip` with `aria-pressed` |
| Card | `olx-card` (`--elevated`) |
| Listing card | `olx-listing` (`--featured`, `--row`), `__media`, `__body`, `__price`, `__title`, `__meta`, `__badge`, `__fav`, `__head`, `__desc`, `__actions`, `__ribbon` |
| Alert | `olx-alert` + `--info` / `--success` / `--warning` / `--danger` |
| Header | `olx-header`, `__logo`, `__search`, `__actions` |
| Layout | `olx-container`, `olx-grid`, `olx-stack`, `olx-cluster`, `olx-divider` |
| Top bar | `olx-topbar`, `__inner`, `__logo`, `__link`, `__actions`, `__login` |
| Sell button | `olx-sell` |
| Location picker | `olx-location` (`--block`), `__pin`, `__value`, `__chevron`; `aria-expanded` rotates the chevron |
| Search row | `olx-searchbar` (wraps `olx-location` + `olx-search`) |
| Category nav | `olx-catnav`, `__inner`, `__all`, `__link` |
| Category tiles | `olx-cattiles`, `olx-cattile`, `__icon`, `__label` |
| Section header | `olx-section-header`, `olx-link-more` |
| Breadcrumb | `olx-breadcrumb` (`nav` > `ol` > `li`, last item `aria-current="page"`) |
| Page title | `olx-page-title` (h1 + `olx-badge--accent` count) |
| Filter panel | `olx-filter`, `__title`, `__list`, `__item` (`aria-current="true"`), `__count`, `__more`, `__range` |
| Image gallery | `olx-gallery`, `__stage`, `__nav--prev` / `--next`, `__count`, `__thumbs`, `__thumb` (`aria-current`) |
| Price / ad summary | `olx-price` (`--md` / `--lg`), `olx-ad-summary`, `__title`, `__actions`, `__meta`, `__location` |
| Details table | `olx-details` (`dl`), `__row` |
| Seller card | `olx-seller`, `__profile`, `__avatar`, `__who`, `__label`, `__name`, `__stats`, `__stat`, `__stat-icon`; `olx-contact`, `__foot`, `__report` |
| Footer | `olx-appbanner`, `__inner`, `__title`, `__stores`; `olx-footer`, `__cols`, `__heading`, `__links`, `__social`, `__bar`, `__bar-inner` |

See `index.html` for live examples of each.

## Design system book

```sh
npm install
npm run fetch-fonts   # once: Geomanist into fonts/ (git-ignored)
npm run book          # then open http://localhost:6006/book/
```

The book lists every captured component and page template. Each component can be viewed as a live render (cropped out of its full page template, so the layout is exact), as the live screenshot, or as its HTML with a copy button. Templates can be opened full size.

**Screens** in the book lists every page and state captured for the prototype (`site/`), grouped like the prototype. Each screen shows its live HTML, its screenshot or its full HTML source, and every section with its own live render and HTML. The prototype opens from the book's contents, and each prototype screen links back to its page in the book.

To publish the book as one page, `npm run build:publish` writes a flat copy to `dist/book/` (git-ignored): the book at the root, the prototype in `proto/`, and section HTML packed into a few JSON bundles in `site/sections/` so the copy stays within the publisher's file limits.

### GitHub Pages

Every push to `main` deploys the book and the Storybook to https://iqratahir-8.github.io/OLX-Design-System/ (`.github/workflows/pages.yml`):

| URL | What |
| --- | --- |
| `/` | Design system book |
| `/proto/` | Clickable prototype |
| `/storybook/` | Storybook (`storybook/`): components, 48 captured pages, 8 flows |
| `/showcase/` | Component showcase (`index.html`) |

The build needs no browser and never contacts olx.com.pk: it runs `build-prototype`, `build-publish` (with `BOOK_STORYBOOK_URL=storybook/`, so the book links to the Storybook beside it) and `storybook build`. Refresh captures locally and commit them, and the next push republishes. Licensed fonts are not in git, so the published copy uses fallback fonts; listing photos and some icons load from OLX's own servers. One-time setup: in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**. To redeploy without a push, run the workflow from the **Actions** tab.

To refresh the captures from the live site:

```sh
npm run snapshot                # all pages, desktop + mobile
npm run snapshot -- ad-detail   # one page
```

Scripts, ad slots and iframes are removed, links are made inert, and personal data (seller names and photos, phone numbers in ad text) is redacted. Listing photos load from images.olx.com.pk.

## Storybook and design kit (`storybook/`)

`storybook/` is the design kit built on the Mac and imported from the `local-build` branch: tokens and `olx-*` CSS components, React wrappers, and 48 captured pages (Classifieds 9, Property 10, Motors 29) on desktop and mobile with 8 flows, plus the raw Motors server HTML in `storybook/motors-html/`. See `storybook/MERGE.md`.

```sh
cd storybook
npm install
npm run localize   # once: downloads the fonts (not in git, they are licensed)
npm run dev        # Storybook on http://localhost:6006
```

Seller phone numbers in captured ad titles and links were replaced with 03XX-XXXXXXX on import.

## Icons, illustrations and assets

```sh
npm run assets   # rebuild assets/ from the captures in site/
```

Every icon and image the captured pages use is stored on its own in `assets/`, named and deduplicated, with `assets/index.json` listing each file, its source, its rendered sizes and the screens it appears on:

- `icons/`: inline SVG icons (named from their label or the text beside them; unlabelled ones were named by eye)
- `css-icons/`: SVGs the stylesheets draw as backgrounds (checkboxes, dropdown arrows, patterns)
- `categories/`: category illustrations from the home page tiles
- `illustrations/`, `logos/`, `images/`: banners, partner and sponsor logos, header backgrounds and seasonal artwork, downloaded from www.olx.com.pk/assets/

Listing photos are ads posted by users, so they are not included. The book's **Assets** section shows them all on light, dark or checkerboard backgrounds, with download and copy-SVG buttons.

## Clickable prototype

```sh
npm run capture:site     # capture pages, states and sections into site/ (skips ones already captured)
npm run prototype        # wire hotspots, then open http://localhost:6006/prototype/
```

The prototype shows every captured screen (desktop and mobile). Links and buttons are hotspots in the positions they were captured from and lead to the screen a user would reach: categories, ads, search, location, sort and filter sheets, and the login modal that guards selling, chat and favourites. **Flows** in the sidebar walk through the main journeys step by step and highlight the control to use next. **Sections** lists each screen's sections; **HTML** opens a section rendered live with its markup and a copy button. **Live HTML** in the toolbar renders the captured HTML and CSS instead of the screenshot (scrolled states stay screenshots).

What is captured: home, Motors and Property landing pages, all 14 categories, subcategories with their own layout, one ad per category (plus cars, houses and online jobs), search results and no results, sorting, a city and a city+category page, the sitemap, and interaction states (login options and steps, sign up, All categories menu, location menu, search suggestions, sort menu, and on mobile the location prompt, filter, brand and price sheets).

**Motors** (29 pages and 3 scrolled-header states, desktop and mobile) is imported from the design kit on the `local-build` branch, because the Motors CDNs are not reachable from every machine:

```sh
git worktree add ../olx-local-build origin/local-build
node scripts/import-motors.mjs ../olx-local-build/design-kit/templates
npm run prototype
```

Each saved page is loaded at its live URL with the kit's saved CSS, fonts and icons served at their original CDN addresses, then captured like every other page (screenshots, sections, hotspots, redaction, including reviewer names). Car photos and banners the kit did not save are blank in the screenshots and load from the CDN in Live HTML. The saved pages have no scripts, so menus, dialogs, calculators and form errors on Motors pages are not captured; with network access to `*.olx.com.pk`, `npm run capture:site -- motors-compare` captures any of them live instead.

Crawling follows robots.txt, so nothing under `/post/`, `/chat/`, `/profile/` or `/account` is visited. To add logged-in screens, run this on your own computer:

```sh
npx playwright install chromium
npm run capture:logged-in -- --redact "Your Name"
npm run prototype
```

A browser opens; log in yourself, open each screen (My Ads, Chats, the Sell form…) and name it in the terminal. Phone numbers and email addresses are always redacted; `--redact` also replaces your name. Check `site/pages/account-*` before committing, since this repo may be public.

## Auditing against live OLX and maple

```sh
npm i -D playwright
npm run capture:live                                   # -> audit/live-snapshots/
MAPLE_URL=http://localhost:3000 npm run capture:maple  # -> audit/maple-snapshots/
```

Compare each template side by side, record the differences in `audit/comparisons/<template>.md`, then promote confirmed values into `tokens/tokens.json` and `css/components.css`.

## Development

Edit `tokens/tokens.json`, then regenerate:

```sh
npm run build     # writes css/tokens.css and dist/tokens.js
npm run preview   # serves the repo; open /index.html
```

The generated files are committed so the CSS works without a build step. Text/background token pairs are chosen to meet WCAG AA contrast (4.5:1) in both themes.

Token values are matched to the live site (see `audit/comparisons/live-vs-repo.md`). The font stack names Geomanist, OLX's typeface; it is licensed and not bundled, so pages fall back to Helvetica/Arial unless you load your own licensed copy.
