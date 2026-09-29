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
templates/                Page templates to capture (home, search-results, ad-detail, post-ad, ...)
audit/live-snapshots/     Captures from https://www.olx.com.pk/
audit/maple-snapshots/    Captures from the local maple repo
audit/comparisons/        Live vs maple diff notes
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
