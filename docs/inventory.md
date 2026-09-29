# Inventory

Status per item: `todo` → `captured` (live) → `compared` (tokens/CSS checked against live) → `specced` (also reconciled with maple).

## Templates

| Template | Live URL path | Status |
|---|---|---|
| home | `/` | captured |
| search-results | `/items/q-<query>` | captured |
| category-listing | `/<category>_c<id>` | captured |
| ad-detail | `/item/<slug>-iid-<id>` | todo |
| post-ad | `/post` | todo |
| profile | `/profile/<id>` | todo |
| chat | `/chat` | todo |
| login | login modal | todo |

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
| LocationPicker | — | header | todo |
| PriceTag | — | ad-detail | todo |
| Breadcrumb | — | listings, ad-detail | todo |
| CategoryNav | — | home, header | todo |
| FilterPanel | — | listings | todo |
| SellerCard | — | ad-detail | todo |
| ImageGallery | — | ad-detail | todo |
| Footer | — | all | todo |

"built" means it exists in this repo. "compared" means it has been checked against live and updated (see `audit/comparisons/live-vs-repo.md`). Maple is still pending.
