# OLX Design System

The design system and the real product, in one Storybook: tokens, components, and frozen captures
of every page flow across **OLX Classifieds**, **OLX Property** and **OLX Motors**.

```bash
npm install
npm run dev       # Storybook on http://localhost:6006
```

## What's in it

| Section | What it is | Source |
|---|---|---|
| Overview | Index of everything, plus a table of every captured page | — |
| Foundations | Colour, type and spacing | `tokens/tokens.json` |
| Components | The `olx-*` classes — buttons, cards, filters, galleries, footer… | `css/components.css` |
| Pages | 48 captured pages, rendered exactly as they ship | `design-kit/templates/` |
| Flows | 8 end-to-end journeys through those pages | `design-kit/sites.json` |

The two product repos behind it:

- **maple** (`ZTechGroup/maple`) — classifieds and property, live at olx.com.pk
- **olx-motors-nextjs** — Motors, live at olx.com.pk/motors

## The captured pages

Each page story renders the template file itself, so Storybook and the design kit can never
disagree. Switch **device** between desktop (1440px) and mobile (390px).

Pages are frozen copies of production, with three deliberate changes:

- **Scripts are stripped.** Anything that only exists once JavaScript runs — dropdowns, modals,
  filter sheets — is not in the capture.
- **Links are rewritten.** A link to another captured page opens that page inside the frame, so
  flows are clickable. Everything else opens the live site in a new tab.
- **Forms are inert.** Nothing can be submitted. No lead, finance, insurance or inspection
  enquiry can be sent from the kit, by accident or otherwise.

Fonts and icons are downloaded into `design-kit/templates/_assets/` because the CDNs restrict
them to `www.olx.com.pk`; left remote, the pages would silently fall back to a system font.

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Storybook |
| `npm run capture:sites` | Re-render classifieds + property from the live site (Chrome, GET only) |
| `npm run capture:motors` | Re-fetch the Motors server HTML |
| `npm run build:kit` | Rebuild templates, localise assets, regenerate stories |
| `npm run build:tokens` | Rebuild `css/tokens.css` and `dist/tokens.js` from `tokens/tokens.json` |
| `npm run build:storybook` | Static build into `storybook-static/` |

Capturing only ever navigates and scrolls — it never clicks, types or submits, and pages that
redirect to a login wall are skipped rather than saved.
