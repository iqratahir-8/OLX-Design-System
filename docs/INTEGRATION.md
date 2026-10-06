# Using the design system in code

This repo has three layers. Only the first is meant to ship in product code; the
other two are the reference it is checked against.

| Layer | Where | Use it for |
|---|---|---|
| **Tokens and components** | `storybook/tokens/tokens.json`, `storybook/css/*.css`, `storybook/src/components/` | Building UI: colours, type, spacing, the `olx-*` classes and React wrappers |
| **Pages and flows** | `catalog/index.json`, `site/pages/`, `storybook/design-kit/templates/` | The spec: what every page and journey looks like today, as HTML |
| **Assets** | `assets/` (`assets/index.json`) | Icons, illustrations, category art and logos, one file each |

Everything is indexed in **`catalog/index.json`** (pages, flows, sections,
components, assets, tokens), with every path relative to the repo root, so tools
and tests can find anything without knowing the folder layout.

## 1. Tokens

`storybook/tokens/tokens.json` is the source of truth. `npm run build:tokens`
(in `storybook/`) writes `css/tokens.css` (CSS custom properties) and
`dist/tokens.js` (a JS object).

```css
@import "olx-design-system/css/tokens.css";
.price { color: var(--olx-color-petrol-900); font-size: var(--olx-font-size-xl); font-weight: var(--olx-font-weight-bold); }
```

```js
import tokens from 'olx-design-system'; // dist/tokens.js
```

For native apps, feed the same `tokens.json` to Style Dictionary to generate
Swift and Kotlin constants, so web, iOS and Android read one file.

## 2. Components

- **Plain HTML/CSS:** `@import "olx-design-system/css/olx.css"` (tokens, base
  and components), then use the `olx-*` classes. Every class has a Storybook
  story with its markup.
- **React:** `storybook/src/components/` has Button, Badge, Chip, Alert, Field,
  Breadcrumb and ListingCard. They are thin wrappers over the same classes.

**Recommended:** publish `storybook/` as a versioned package. Its
`package.json` already exports the tokens and CSS. To set it up:
1. Rename it to a scoped name, e.g. `@olx/design-system`.
2. Publish it to GitHub Packages on every tagged release.
3. Install it in maple and olx-motors-nextjs.

Bump the version when tokens or components change, so each app upgrades on
purpose.

## 3. Pages and end-to-end flows (the spec)

Every page is stored as standalone HTML that opens in a browser:

- `site/pages/<id>/<desktop|mobile>.html`: captured from olx.com.pk. Each one
  has a screenshot (`.png`), a measurements file (`.json`: sections, links and
  buttons with positions) and one HTML file per section in `sections/`.
- `storybook/design-kit/templates/<site>/<desktop|mobile>/<page>.html`: the
  design kit (Motors, Property, Classifieds). Links between kit pages work.

Flows are the user journeys through those pages:

- `catalog/flows/<id>.json`: steps in order, each with its page, what happens
  there, the control used to move on, and the desktop and mobile HTML.
- `docs/FLOWS.md`: the same, readable, with links.
- The prototype (`npm run prototype`, then Flows) plays them.

The captured HTML is a **reference, not code to copy**:
- Class names are hashed build output.
- Scripts are stripped, so menus and sheets are separate captured states.
- Personal data is redacted.

Use it to:
- **Build a page:** open its HTML, inspect the structure and computed styles,
  and rebuild it with the tokens and components.
- **Review a change:** compare your page with the captured one side by side in
  the book (Screens), at the same width.
- **Test:** `examples/flows.spec.mjs` turns any flow into a Playwright visual
  test. It renders the captured steps as baselines, then compares your app's
  pages against them step by step.
- **Write tickets:** link a flow step or section in the book instead of
  attaching screenshots.

## 4. Assets

`assets/index.json` lists every icon and image with its source, sizes and the
pages it appears on. To use them:
- Turn `assets/icons/*.svg` into a sprite, or into React icon components with
  SVGR.
- Load raster art from `assets/categories/` and `assets/images/` directly.

Fonts (Geomanist, GE SS Two) are licensed and not in git. `npm run fetch-fonts`
(root) and `npm run localize` (`storybook/`) download them for local use.

## 5. Keeping it current

| When | Run |
|---|---|
| The live site changed | `npm run capture:site` (root, for classifieds and property states), or `npm run capture:motors` / `capture:sites` in `storybook/` |
| After any capture | `node scripts/import-kit.mjs && node scripts/build-prototype.mjs && npm run assets && node scripts/build-catalog.mjs` |
| Logged-in screens (post an ad, upsell, my account) | `npm run capture:logged-in` on your own machine; the browser asks you to log in |
| Publishing | Pushing to `main` deploys the book, prototype and Storybook to GitHub Pages (`.github/workflows/pages.yml`) |

Capturing obeys robots.txt and never submits a form. Check new captures for
personal data before committing: this repo is public.
