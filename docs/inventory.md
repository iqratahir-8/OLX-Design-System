# Inventory

Status per item: `todo` → `captured` (live) → `compared` (vs maple) → `specced`.

## Templates

| Template | Live URL path | Status |
|---|---|---|
| home | `/` | todo |
| search-results | `/items/q-<query>` | todo |
| category-listing | `/<category>_c<id>` | todo |
| ad-detail | `/item/<slug>-iid-<id>` | todo |
| post-ad | `/post` | todo |
| profile | `/profile/<id>` | todo |
| chat | `/chat` | todo |
| login | login modal | todo |

## Components

Existing ones live in `css/components.css` (shown in `index.html`); the rest are gaps to capture from the live site.

| Component | Class | Seen on live | Status |
|---|---|---|---|
| Button | `olx-btn` | all | built |
| Form field / Input / Select | `olx-field`, `olx-input`, `olx-select` | search, post-ad | built |
| Search bar | `olx-search` | header | built |
| Badge (Featured) | `olx-badge` | ad cards | built |
| Chip | `olx-chip` | filters | built |
| Listing card | `olx-listing` | home, listings | built |
| Alert | `olx-alert` | forms | built |
| Header | `olx-header` | all | built |
| LocationPicker | — | header | todo |
| PriceTag | — | ad-detail | todo |
| Breadcrumb | — | listings, ad-detail | todo |
| CategoryNav | — | home, header | todo |
| FilterPanel | — | listings | todo |
| SellerCard | — | ad-detail | todo |
| ImageGallery | — | ad-detail | todo |
| Footer | — | all | todo |

"built" means it exists in this repo. It still needs a `compared` pass against live and maple.
