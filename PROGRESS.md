# OLX Design System — progress and hand-over

Status as of **9 Oct 2026**. Written for whoever picks this up next, in another account or
another Claude session. Read this first, then `README.md`.

## Where things are

| What | Where |
| --- | --- |
| Repository | `iqratahir-8/OLX-Design-System` on GitHub, branch `main` |
| Design system book | https://iqratahir-8.github.io/OLX-Design-System/ |
| Storybook | https://iqratahir-8.github.io/OLX-Design-System/storybook/ |
| Clickable prototype | https://iqratahir-8.github.io/OLX-Design-System/proto/ |
| Component showcase | https://iqratahir-8.github.io/OLX-Design-System/showcase/ |
| Source of truth | the live site https://www.olx.com.pk and the product codebase `ZTechGroup/maple` (private; read on the Mac, never in the cloud) |

`/book/` and `/prototype/` on the live site redirect to `/` and `/proto/`.

Every push to `main` rebuilds and redeploys the site (`.github/workflows/pages.yml`, about 5 minutes).

## What is done

- **Tokens.** `tokens/tokens.json` is the source of truth: colours, semantic light and dark theme, type, spacing, radius, shadow and motion. `npm run build` generates `css/tokens.css` and `dist/tokens.js`.
- **Font.** Geomanist is committed and published, since OLX holds the licence, in three weights only: Regular 400, Book 500 and Medium 600. Bold and Thin are not used. There is no bold token, `<strong>` uses 600, and `font-synthesis: none` stops faked bold. The Arabic GE SS Two font is not in git.
- **CSS components.** `css/components.css` holds the `olx-*` classes; the README has the list. The showcase is `index.html`.
- **Live captures** from olx.com.pk, re-captured in one full pass on 7 Oct 2026 with photos:
  - `site/pages/`: 106 pages and states, 202 captures across desktop and mobile. Each has HTML, a screenshot, section crops and link hotspots.
  - `templates/`: 6 page templates (home, search results, category listing, ad detail, and the two location popups).
  - `components/`: 39 components, 66 captures across desktop and mobile.
  - `assets/`: 237 icons, illustrations and images.
- **Storybook** (`storybook/`, built on the Mac from the `local-build` branch):
  - components, foundations and patterns;
  - 48 page stories across Classifieds, Property and Motors, plus 8 flows.
- **Design system book** (`book/`): foundations, components, templates and every captured screen, each with its live HTML, screenshot and source. It also includes the design-kit screens.
- **Prototype** (`prototype/`): 222 screens and 32 guided flows, built from the captures.
- **Catalog** (`catalog/`): a developer index of pages, flows, sections, components and assets.
- **Claude skill.** `.claude/skills/olx-design-system/SKILL.md` gives the rules (look at the live screen first, tokens only, `olx-*` components first, both viewports, accessibility), plus a token and markup quick reference, OLX content conventions and where everything is.
  - Claude Code loads it automatically in this repo.
  - For claude.ai, upload the `olx-design-system` folder as a skill.
- **Manifest for Claude Design and other tools.** `design-system.json` is one index of tokens (light and dark values), CSS components (classes, modifiers, elements), React wrappers, live components and their states, templates, screens, flows, assets, quality results and known gaps, all with file paths.
  - Generated from the repo with `npm run manifest`.
  - Published at https://iqratahir-8.github.io/OLX-Design-System/design-system.json.
- **Pixel check.** `npm run verify:pixels` renders every stored capture and compares it with its live screenshot. The latest results are in `audit/pixel-report.md`:

  | | Match | Close | Off | Not compared |
  | --- | --- | --- | --- | --- |
  | Screens | 141 | 10 | 39 | 12 |
  | Templates | 6 | – | 4 | – |
  | Components | 22 | 12 | 19 | 1 |

  - Screens and templates marked "off" are listing pages, 3–11% different. The cause is result counts and "x minutes ago" text that change after the screenshot.
  - "Not compared" are scroll states, which static HTML can't reproduce.

### Pull requests (all merged)

1. #1: tokens, base styles, components, docs page
2. #2: GitHub Pages deploy; Storybook kit and Motors pages
3. #3: design kit merged into the book; Storybook page index fixes
4. #4: full re-capture, pixel check, `/book/` and `/prototype/` redirects
5. #5: fix for the 404 on the book's design-kit screens

## What is not done (open work)

1. **Logged-in screens.** Post an ad, chat, profile and my ads can't be captured from the cloud, because they need your OLX login. Capture them on the Mac with `npm run capture:logged-in`, which opens a browser for you to log in.
2. **Component captures to redo.** These capture or markup problems are known; see `audit/pixel-report.md`:
   - the mobile breadcrumb was captured 1 px tall;
   - the filters sidebar was captured partly expanded;
   - the app banner and delivery card render shorter than live;
   - the desktop sell button times out in the checker.
3. **Matching with `maple`.** `audit/comparisons/live-vs-repo.md` covers live versus this repo. Reconciling components with the `maple` source is still pending; `docs/inventory.md` marks it "specced".
4. **Site size.** The published site is about 710 MB, against GitHub Pages' 1 GB limit, because the screenshots now include photos. Shrink the screenshots (WebP, or a lower scale on mobile) before adding much more.

## Moving to another account

1. **Move the repo.** On GitHub, go to Settings → General → Danger zone → *Transfer ownership*, or fork it, or push a mirror:
   ```sh
   git clone --mirror https://github.com/iqratahir-8/OLX-Design-System.git
   cd OLX-Design-System.git && git push --mirror https://github.com/<new-owner>/OLX-Design-System.git
   ```
   The repo is about 250 MB, so push over a stable connection.
2. **GitHub Pages.** In the new repo, set Settings → Pages → *Source* to **GitHub Actions**, not "Deploy from a branch". Then run the workflow once from the Actions tab.
3. **Update the hard-coded URLs** to the new owner:
   - `README.md` (Pages links);
   - `scripts/build-manifest.mjs` (the `BASE` constant), then run `npm run manifest`;
   - `.claude/skills/olx-design-system/SKILL.md` (the published `design-system.json` link);
   - `scripts/build-publish.mjs` (the default `BOOK_STORYBOOK_URL`, a claude.ai artifact link that belongs to the old account; Pages overrides it, so it matters only for the claude.ai copy).
4. **Claude access.** Install the Claude GitHub App on the account that **owns** the repo (https://github.com/apps/claude), then reconnect GitHub at claude.ai → Settings → Connectors. Earlier, the app was installed on `iqratahir` while the repo belonged to `iqratahir-8`, which caused 403s on every push.
5. **Cloud environment.** In the Claude Code cloud environment, set Network access to **Full**, or allow these hosts: `www.olx.com.pk`, `images.olx.com.pk`, `<owner>.github.io`. Without them, captures and checks of the live site can't run.
6. **Mac session.** The Mac session (`claude remote-control` started in the `maple` folder) is the one that can read `maple`, use your logged-in OLX account and run Chrome. Point it at the new repo remote.

## How to work on it

```sh
npm ci                      # Playwright, pngjs, simple-icons
npm run book                # book at http://localhost:6006/book/
cd storybook && npm ci && npm run dev   # Storybook at http://localhost:6006
```

Refresh from the live site, only when OLX changes. This takes about 1.5 hours:

```sh
node scripts/capture-site.mjs --force    # all public screens -> site/
node scripts/snapshot-live.mjs           # templates/ and components/
node scripts/build-prototype.mjs && node scripts/build-catalog.mjs
MASK_PHOTOS=1 npm run verify:pixels      # writes audit/pixel-report.md
```

- `capture-site` replaces each screen in place; screens it can't capture keep their old files.
- After a forced re-capture, delete section files the new `.json` files no longer list. Commit in batches of about 12 pages, because very large pushes have been rejected.

## Gotchas learned the hard way

- **Cloud Chromium and certificates.** In a cloud session, the bundled Chromium doesn't trust the session's HTTPS proxy, so pages fail with `ERR_CERT_AUTHORITY_INVALID`. The fix is to add the proxy's CA certificates (the "Anthropic" ones in `/root/.ccr/ca-bundle.crt`) to `/root/.pki/nssdb` with `certutil` (package `libnss3-tools`). Don't switch off certificate checks.
- **Node and the proxy.** Node's built-in `fetch` ignores the proxy unless you run it with `NODE_USE_ENV_PROXY=1`.
- **Storybook and the book share a folder.** The Storybook build empties its output folder, and the book puts design-kit pages under `storybook/` too. The workflow therefore builds Storybook separately and merges it in. Don't change that back.
- **Lazy-loaded photos.** OLX puts listing photo URLs in `data-src`. `scripts/lib/capture-lib.mjs` (`freezePage`) copies them into `src`, so static copies show photos. `scripts/fix-lazy-images.mjs` repairs older captures.
- **Pages sized to the window.** Motors uses `vh` units, so its page height depends on the window height. The pixel check sizes the window from the live screenshot, not from the saved page height.
- **Pixel check and animations.** The checker jumps animations to their end state. Turning them off would leave fade-in popups invisible and make them look missing.
- **Two sessions on one branch.** The Mac session and cloud sessions both pushed to `claude/olx-design-system-setup-1chba1`. Fetch before you push, and never force-push over the other session's work.
