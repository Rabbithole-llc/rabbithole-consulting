# `/audit/<slug>` — printed-audit deep-dive pages

Each owner-facing audit (the page a QR code on the printed PDF lands on) is one self-contained static HTML file in this directory. The site is static-on-Vercel with `cleanUrls: true`, so `audit/<slug>.html` resolves at `https://rabbithole.consulting/audit/<slug>`. No router, no build step.

## Adding a new audit

1. **Copy the template.**
   ```sh
   cp audit/_template.html audit/<slug>.html
   ```
   Use a stable kebab-case slug (the property's URL-safe short name). It becomes the live URL, so it goes on the printed QR.

2. **Fill the `{{PLACEHOLDERS}}`.** Open the file and replace every `{{...}}` with the property's data. The full set is listed at the bottom of this README; the structure of the file is:
   - **Header / hero** — name, address, score, lede, ring note.
   - **Where you stand** — 9 scorecard rows. Tone is `good`, `warn`, or `crit` (drives the tag color).
   - **Research cards** — 14 cards by default. Each has a fixed `.lab` (category) and per-property `.val` / `.src` placeholders. Add or remove `<div class="card">` blocks if the dimension doesn't apply.
   - **Distribution pills + paragraph** — narrative + per-platform status.
   - **Reputation paragraph**.
   - **Findings** — 6 prioritized findings by default, each with title, severity (`t-crit` Critical, `t-warn` High/Medium), why-it-matters, and fix. Add or remove `<details>` blocks as needed.
   - **Priority plan** — 4 ordered steps.
   - **Beyond the audit** — 14 standard offerings, two location-specific phrases left as placeholders (`{{CATEGORY_LOCAL}}`, `{{COMPETITIVE_SET}}`).
   - **Booking** — iClosed widget, do not edit.
   - **Footer** — audit date.

3. **House rules.**
   - **No em-dashes.** Use a comma or a regular spaced dash (` - `) instead. The em-dash is a common AI tell. Grep `'—\|&mdash;'` on the file before committing; should be `0`.
   - **No pricing** on the page. The CTA is the iClosed booking widget, not a price.
   - **Don't touch the iClosed snippet** (the `<head>` preconnect/dns-prefetch/preload hints and the `.iclosed-widget` + `widget.js` block). It mirrors the live homepage `/#book` integration — see `index.html` for parity.
   - **`<meta name="robots" content="noindex">`** stays. Audits are reached by QR / direct link, not search.

4. **Commit and PR.** One audit per PR, branch off `main`. The Vercel preview deploy on the PR is the visual check; production goes live on merge.

## Placeholder reference

### Single values
| Placeholder | Example |
|---|---|
| `{{HOTEL_NAME}}` | El Colonial Hotel |
| `{{HOTEL_LISTING_NAME}}` | El Colonial Hotel - Adults Only |
| `{{NEIGHBORHOOD}}` | Old San Juan |
| `{{ADDRESS}}` | 312 C. de San Francisco, San Juan 00901 |
| `{{SCORE}}` | 56 |
| `{{CATEGORY_SEARCH}}` | boutique hotel Old San Juan |
| `{{CATEGORY_LOCAL}}` | boutique hotel in Old San Juan |
| `{{COMPETITIVE_SET}}` | Old San Juan boutique hotel |
| `{{AUDIT_DATE}}` | 2026-05-25 |

### Narrative blocks
`{{LEDE_PARAGRAPH}}` · `{{RING_NOTE}}` · `{{DISTRIBUTION_PARAGRAPH}}` · `{{REPUTATION_PARAGRAPH}}` · `{{FINDINGS_FOOTNOTE}}`

### Scorecard (9 rows)
For `N` in `1..9`: `{{ROW_N_TONE}}` (`good` / `warn` / `crit`) and `{{ROW_N_VALUE}}` (the visible tag text).

### Research cards
Each card has paired placeholders for its visible value and source note: `{{CARD_GOOGLE_VAL}}`, `{{CARD_GOOGLE_SRC}}`, `{{CARD_KP_VAL}}`, `{{CARD_KP_SRC}}`, `{{CARD_BOOKING_VAL}}`, `{{CARD_BOOKING_SRC}}`, `{{CARD_SCHEMA_VAL}}`, `{{CARD_SCHEMA_SRC}}`, `{{CARD_BRAND_SEARCH_VAL}}`, `{{CARD_BRAND_SEARCH_SRC}}`, `{{CARD_CATEGORY_SEARCH_VAL}}`, `{{CARD_CATEGORY_SEARCH_SRC}}`, `{{CARD_TECH_SEO_VAL}}`, `{{CARD_TECH_SEO_SRC}}`, `{{CARD_MOBILE_PERF_VAL}}`, `{{CARD_MOBILE_PERF_SRC}}`, `{{CARD_PAGE_WEIGHT_VAL}}`, `{{CARD_PAGE_WEIGHT_SRC}}`, `{{CARD_SECURITY_VAL}}`, `{{CARD_SECURITY_SRC}}`. OTA cards also carry a URL placeholder: `{{CARD_TRIPADVISOR_VAL}}` + `{{CARD_TRIPADVISOR_URL}}` (same for `BOOKINGCOM`, `EXPEDIA`, `YELP`).

### Distribution pills
`{{DIRECT_BOOKING_STATUS}}` · `{{TRIPADVISOR_STATUS}}` · `{{BOOKINGCOM_STATUS}}` · `{{EXPEDIA_STATUS}}` · `{{YELP_STATUS}}` · `{{AIRBNB_STATUS}}`

### Findings (6)
For `N` in `1..6`: `{{FINDING_N_TITLE}}`, `{{FINDING_N_SEVERITY_CLASS}}` (`t-crit` / `t-warn`), `{{FINDING_N_SEVERITY}}` (`Critical` / `High` / `Medium`), `{{FINDING_N_WHY}}`, `{{FINDING_N_FIX}}`.

### Priority plan (4)
For `N` in `1..4`: `{{PLAN_N_TITLE}}`, `{{PLAN_N_BODY}}`.
