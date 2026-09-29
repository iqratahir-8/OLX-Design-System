# Live olx.com.pk vs this repo

Captured 2026-09-29 from https://www.olx.com.pk/ (home, `/items/q-iphone`, `/mobile-phones_c1453`).
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
| Location field | 300px, 46px, radius 6px | not built yet |
| Sell button | 104×48, gradient ring (yellow/teal/blue) | not built yet |
| Listing card (grid) | 1px #e8ecec border, radius 4px, 311px wide at 1440 | border → `border-subtle`, radius → `sm`, grid min 215px |
| Listing card (featured, list view) | 1px #00a49f border, radius 8px, teal glow | `--featured` uses `featured` border + `shadow-featured` |
| Price | 18px / 600 | weight → semibold |
| Title / meta | 14px #406367 / 12px #406367 | matches |
| Buttons, badges | 600 weight | weight → semibold |
| Breadcrumb | 14px rgba(0,47,52,.64) | not built yet |

## Still to capture

- Templates: ad-detail, post-ad, profile, chat, login (need specific URLs and, for some, a signed-in session).
- Components listed as `todo` in `docs/inventory.md`.
- Listing photos: `images.olx.com.pk` must be allowed in the environment network policy.
