# Live olx.com.pk vs this repo

Captured 2026-09-29 from https://www.olx.com.pk/ (home, `/items/q-iphone`, `/mobile-phones_c1453`, and one ad-detail page picked from the home page).
Sources: inline CSS in `audit/live-snapshots/*/desktop/page.html.gz`, and computed styles in
`audit/live-snapshots/components.json` (from `scripts/inspect-components.mjs`).

The **maple** column is still empty. Maple hasn't been captured yet (see `README.md`, "Auditing against live OLX and maple").

## Foundations

| Token | Before | Live | Now | Maple |
|---|---|---|---|---|
| Font family | Inter | Geomanist, Helvetica, sans-serif | Geomanist stack (not bundled, licensed) | — |
| Root size | 16px | `html { font-size: 62.5% }` (1rem = 10px) | tokens in px, unchanged | — |
| Body text | 16px / 1.5 | 14px / 21px | `font-size-sm` / 1.5 | — |
| Font weights | 400, 500, 700 | 600 dominant (951 uses), then 700, 400, 500 | added `semibold: 600` | — |
| Type scale | 12 14 16 20 24 32 40 | 12 14 16 18 20 24 32 40 | `xs`…`4xl` = 12…40 incl. 18 | — |
| h1 (listing page) | 40px bold | 23.94px / 600 | `2xl` 24px semibold | — |
| Footer heading | — | 15.96px / 600 | `md` semibold | — |
| Text | #002f34 | #002f34 | unchanged | — |
| Muted text | #406367 | #406367 (card title, meta), rgba(0,47,52,.64) (breadcrumb) | unchanged | — |
| Border | #cbd5d6 | #d8dfe0 (411 uses) | `petrol-100` = #d8dfe0 | — |
| Card border | — | #e8ecec | `border-subtle` = `petrol-75` | — |
| Subtle bgs | #f2f4f5 | #f2f4f5, #fafbfb, #f7f8f8 | added `petrol-25` #fafbfb | — |
| Dark teal | — | #006169 (336 uses), #00a49f (featured) | `teal-900`, `teal-700` | — |
| Link / info blue | #3a77ff, #2456d6 | #3a77ff (510 uses) | unchanged | — |
| Info bg | #e0eaff | #ebf1ff | `blue-100` = #ebf1ff | — |
| Radius | 4 8 16 pill | 4px (1100+), 8px, 6px (search + location fields) | added `field: 6px` | — |
| Shadow sm | 0 1px 2px | 0 1px 4px rgba(0,0,0,.1) | updated | — |
| Shadow md (menus) | 0 4px 12px | 0 0 6px rgba(0,0,0,.12), 0 4px 20px rgba(0,0,0,.122) | updated | — |
| Featured shadow | — | 0 4px 12px rgba(0,164,159,.2) | added `shadow-featured` | — |
| Breakpoints | 576 768 1024 1280 | 360 480 768 950 1280 | `xs` 360, `sm` 480, `lg` 950 | — |

## Components

| Component | Live measurement | Repo change |
|---|---|---|
| Header | white bg, 143px tall incl. category nav | `olx-header` bg → `surface` |
| Search input | 46px, 16px text, radius 6px 0 0 6px | `olx-search` radius → `field` |
| Search button | 48px, petrol bg, white 16px/600, 0 16px padding | label weight → semibold |
| Location field | 300px, 46px, radius 6px, blue pin + chevron | `olx-location` |
| Sell button | 104×48 pill (radius 240px), yellow/teal/blue ring, 14px/600 uppercase | `olx-sell` with `--olx-gradient-sell-ring` |
| Listing card (grid) | 1px #e8ecec border, radius 4px, 311px wide at 1440 | border → `border-subtle`, radius → `sm`, grid min 215px |
| Listing card (featured, list view) | 1px #00a49f border, radius 8px, teal glow | `--featured` uses `featured` border + `shadow-featured` |
| Price | 18px / 600 | weight → semibold |
| Title / meta | 14px #406367 / 12px #406367 | matches |
| Buttons, badges | 600 weight | weight → semibold |
| Breadcrumb | 14px rgba(0,47,52,.64), chevron separators | `olx-breadcrumb` (uses `text-muted` #406367) |
| Top bar | #ebf1ff strip, 64px, white logo tab, Login 16px/600 underlined | `olx-topbar`, new `brand-bg` token |
| Category nav | "All categories" 16px/600 + chevron, links, 1px top border | `olx-catnav` |
| Category tile | 88×88 icon box #f2f4f5 radius 8px, label 16px/600 | `olx-cattile` |
| Section header | h2 24px/600 (36px line), "View more" 16px/600 | `olx-section-header`, `olx-link-more` |
| Result count badge | #c8f8f6 bg, 14px, 2px 7px padding, radius 4px | `olx-badge--accent`, new `accent-bg` token (teal-100) |
| Filter panel | #fafbfb bg, 1px #e8ecec border, radius 4px, 16px padding; heading 16px/600; counts rgba(0,47,52,.64) | `olx-filter`, new `surface-subtle` token |
| Filter chip | 16px, #fafbfb bg, 1px #d8dfe0 border, radius 6px, 8px 16px padding, 42px tall | `olx-chip` restyled (was a pill) |
| Row listing card | image 32.6% wide, Call/Chat/WhatsApp 40px buttons with 1px inset ring | `olx-listing--row`, `olx-btn--secondary` → 1px inset ring, `olx-btn--sm` → 40px |
| "Ad of the Week" ribbon | 12px/600 white on teal gradient | `olx-listing__ribbon`, `--olx-gradient-promo` |
| Featured badge | #ffce32, 12px/600, 0 6px padding, sentence case | `olx-badge--featured` (badges no longer uppercase) |
| Gallery | 820×480, radius 4px, black letterbox | `olx-gallery`, new `media-bg` token |
| Ad price / title | 40px/600; title 20px/600 (30px line) | `olx-price--lg`, `olx-ad-summary__title` |
| Details table | label #f2f4f5, value #fafbfb 700, 8px 12px cells | `olx-details` |
| Seller card | white, 1px #e8ecec, radius 6px, 12px padding, 56px round avatar, stat value 16px/600 | `olx-seller` |
| Show phone / Chat | full-width 48px primary / outline | `olx-btn--primary` / `--secondary` + `--block` |
| App banner | rgba(0,47,52,.03) bg, 24px/600 title + blue link | `olx-appbanner` |
| Footer | #f2f4f5 bg, 64px vertical padding, headings 16px/600, 40px round social icons | `olx-footer` |
| Copyright bar | petrol bg, white 14px, 16px padding, right-aligned | `olx-footer__bar`, new `inverse-bg` / `on-inverse` tokens |

### Deliberate differences from live

- **Link blue.** Live uses #3a77ff for "View more" and similar links. That is 4.0:1 on white, below WCAG AA for normal text, so these components use the repo's `link` token (#2456d6). The decorative pin icon keeps #3a77ff via `icon-brand`.
- **Artwork.** Category icons, the OLX logo, app-store badges and social icons are OLX/third-party assets and are not copied. The docs use placeholders (emoji, simple SVGs, text buttons).

## Still to capture

- Templates: post-ad, profile, chat, login (need a signed-in session).
- Listing photos: `images.olx.com.pk` must be allowed in the environment network policy.
