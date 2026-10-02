# Inventory

Status per item: `todo` → `captured` (live) → `compared` (tokens/CSS checked against live) → `specced` (also reconciled with maple).

## Templates

| Template | Live URL path | Status |
|---|---|---|
| home | `/` | captured |
| search-results | `/items/q-<query>` | captured |
| category-listing | `/<category>_c<id>` | captured |
| ad-detail | `/item/<slug>-iid-<id>` | captured |
| location-prompt (mobile) | `/` on first visit | captured |
| location-select (mobile) | `/` → Other address | captured |
| post-ad | `/post` | todo |
| profile | `/profile/<id>` | todo |
| chat | `/chat` | todo |
| login | login modal | todo |

## Live captures

`templates/<page>/<viewport>.html` and `components/<name>/<viewport>.html` hold the exact live markup and CSS from olx.com.pk (see `components/index.json`, `templates/index.json`). Browse them in the design system book: `npm run book`. Re-run `npm run snapshot` to refresh.

## Components

Existing ones live in `css/components.css` (shown in `index.html`); the rest are gaps to capture from the live site.

| Component | Class | Seen on live | Status |
|---|---|---|---|
| Button | `olx-btn` | all | compared |
| Form field / Input / Select | `olx-field`, `olx-input`, `olx-select` | search, post-ad | built |
| Search bar | `olx-search` | header | compared |
| Badge (Featured) | `olx-badge` | ad cards | compared |
| Chip | `olx-chip` | filters | built |
| Listing card | `olx-listing` | home, listings | compared |
| Alert | `olx-alert` | forms | built |
| Header | `olx-header` | all | compared |
| Top bar + Sell button | `olx-topbar`, `olx-sell` | all | compared |
| LocationPicker | `olx-location` | header, filters | compared |
| CategoryNav | `olx-catnav` | header | compared |
| Category tiles | `olx-cattile` | home | compared |
| Section header | `olx-section-header` | home | compared |
| Breadcrumb | `olx-breadcrumb` | listings, ad-detail | compared |
| FilterPanel | `olx-filter` | listings | compared |
| Listing card (row) | `olx-listing--row` | listings | compared |
| PriceTag / ad summary | `olx-price`, `olx-ad-summary` | ad-detail | compared |
| Details table | `olx-details` | ad-detail | compared |
| ImageGallery | `olx-gallery` | ad-detail | compared |
| SellerCard | `olx-seller`, `olx-contact` | ad-detail | compared |
| Footer | `olx-appbanner`, `olx-footer` | all | compared |

"built" means it exists in this repo. "compared" means it has been checked against live and updated (see `audit/comparisons/live-vs-repo.md`). Maple is still pending.
