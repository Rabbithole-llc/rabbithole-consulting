# `/audit/<slug>` — printed-audit deep-dive pages

Each owner-facing audit (the page a QR on the printed PDF lands on) is one self-contained static HTML file in this directory. The site is static-on-Vercel with `cleanUrls: true`, so `audit/<slug>.html` resolves at `https://rabbithole.consulting/audit/<slug>`. No router, no build step.

## Adding a new audit

1. **Copy the template.**
   ```sh
   cp audit/_template.html audit/<slug>.html
   ```
   The slug is the property's URL-safe short name in kebab-case. It becomes the live URL, so it is what goes on the printed QR.

2. **Fill the `{{PLACEHOLDERS}}`.** Open the file and replace every `{{...}}` with the property's data. Full placeholder reference is at the bottom of this README. The file follows the canonical structure used by the 10 audits already in this directory:
   - **Header / hero** — name, sub-line (neighborhood · address · domain), opener (lede), score ring, ring note.
   - **Across the funnel** — 5 horizontal subscore bars. Each bar carries a label, a 0-100 value, and a color (see "Severity by type" below).
   - **Where you stand today** — 8 scorecard rows. Tone is `good`, `warn`, or `crit`.
   - **The research behind this audit** — 10 cards by default. Each has a label, value, and source note. Add or remove `<div class="card">` blocks if the dimension doesn't apply.
   - **Distribution & booking** — narrative + 6 platform pills.
   - **Reputation & guest sentiment** — narrative + the standard sampled-sentiment footnote.
   - **What needs attention** — 4 prioritized findings by default. Each is `<details>` with title, severity (`t-crit` Critical / `t-warn` High or Medium), why-it-matters, and fix. Add or remove `<details>` blocks as needed.
   - **The competitive picture** — short paragraph naming the local competitors winning the category search.
   - **If we worked together** — 4 ordered priority steps.
   - **Beyond the audit** — 14 standard offerings (Operations + Marketing & growth). **Do not edit.**
   - **Booking** — iClosed widget. **Do not edit.**
   - **Footer** — audit date.

3. **Commit and PR.** One audit per PR, branch off `main`. The Vercel preview deploy on the PR is the visual check; production goes live on merge.

## House rules

### No money, no pricing
Audits never quote dollar figures, package names, or pricing. The CTA is the iClosed booking widget. Pricing belongs in the conversation, not on the page.

### No em-dashes
The em-dash (`—`) is a common AI tell and we strip it from every page. Use a comma or a regular spaced dash (` - `) instead. **Before committing**, run `grep '—\|&mdash;' audit/<slug>.html` and confirm it returns `0`.

### Fixes describe outcome, not how
The "fix" body in each finding should describe what the property looks like once the work is done, not who does the work or how. Avoid first-person ("we do X", "we'll set up Y"). Avoid naming the implementation step-by-step. Stay outcome-shaped: "hotel tagging surfaces your rating where guests compare," not "we'll add JSON-LD schema with Hotel type and aggregateRating fields." The page is a diagnostic, not a statement of work.

### Severity by type, not color
Severity is conveyed by the **tag class**, not by an inline color. Use:
- `t-crit` + label "Critical" — the property loses revenue right now if this isn't fixed.
- `t-warn` + label "High" — sustained drag on the funnel, but the property still works.
- `t-warn` + label "Medium" — material but not urgent.
- `t-good` + label (e.g., "Solid") — used in the scorecard for things working well.

The same applies to subscore bars: use `var(--good)` (≥70), `#d9a000` (40-69), `var(--crit)` (<40). Don't pick custom colors; the three tiers are the vocabulary.

## Data-gathering lessons (real ones, from the first 10 audits)

These are the false-positives and false-negatives we've actually hit. Check them every time.

### Booking-detection caveat — manually confirm the "Book Now" link
The automated booking-engine detector matches a fixed list and **false-negatives non-standard engines**. We've already shipped corrections for two properties because of this:
- **Villa Herencia** — initial scan said "no direct booking." Reality: a working `Book Now` button that routes to `hotel1630.openhotel.com` (OpenHotel).
- **La Terraza** — actually runs **GraceSoft + Asksuite AI chat**, neither of which the detector recognized.

**Always click the "Book Now" link by hand** before writing the booking row. Engines we've seen in the wild for boutique hotels in Old San Juan: **Cloudbeds, OpenHotel, GraceSoft, Asksuite (AI chat layer)**. Do not write "no direct booking" unless there is genuinely no booking path on the site.

### Google Business Profile points to the wrong website — audit the brand's own site
Some properties have a Google Business Profile whose **website field points to a corporate / aggregator URL** (Hilton, Marriott, Curio, etc.) that 403s to crawlers and is not the property's own page. Hotel Palacio Provincial is the canonical example: the GBP `website` field linked to the Hilton corporate page, which blocks crawlers and ranks below the property's own site.

When this happens:
- Audit the brand's **own** site (e.g., `palacioprovincial.com`), not the corporate URL.
- Make **"your Google listing points to the wrong site"** the Critical finding. It's a five-minute change in the GBP dashboard with outsized funnel effect.

### A broken or booking-404 site is the #1 finding — lead with it
If the property's own site doesn't load, or its booking path 404s, that is **always the Critical finding** and the rest of the audit pauses around it. 352 Guest House is the example: `352guesthouse.com` loads a Cloudbeds error page, so the audit shipped with **3 findings instead of 4**, the technical audit row marked "Pending site fix," and the priority plan led with "Restore the website."

The pattern:
- Scorecard: include a row "Your website loads correctly" with tone `crit` and value "No - error page" (or similar).
- Findings: lead with one Critical titled along the lines of "Your website is broken right now."
- Research cards: note that the page reached wasn't really theirs, so speed / schema / security couldn't be measured.
- Plan step #1: restore the site.

## Placeholder reference

### Hero / header
| Placeholder | Notes |
|---|---|
| `{{SLUG}}` | Used in the QR-target comment at the top of `<body>`. |
| `{{HOTEL_NAME}}` | Used in `<title>` and `<h1>`. |
| `{{SUB_LINE}}` | Single line under the h1 — typical pattern: `Neighborhood · Address · domain.com`. |
| `{{OPENER}}` | The lede paragraph. Lead with strengths if any, name the gap in the same breath. |
| `{{SCORE_RING}}` | Number 0-100. Used twice on the same line (`--p:` and visible `<b>`); fill both. |
| `{{RING_NOTE}}` | One-paragraph caption next to the score ring. Bolded centerline summary inside (e.g., `<b>Excellent reputation, leaky funnel.</b>`). |

### Across-the-funnel bars (5)
For N in 1..5: `{{BAR_N_LABEL}}`, `{{BAR_N_VALUE}}` (0-100), `{{BAR_N_COLOR}}` (`var(--good)` / `#d9a000` / `var(--crit)`).

### Where you stand (scorecard, 8 rows)
For N in 1..8: `{{SCORECARD_N_LABEL}}`, `{{SCORECARD_N_TONE}}` (`good` / `warn` / `crit`), `{{SCORECARD_N_VALUE}}`.

### Research cards (10)
For N in 1..10: `{{CARD_N_LAB}}` (category), `{{CARD_N_VAL}}` (value), `{{CARD_N_SRC}}` (source note, can hold `<a>` links).

### Distribution
`{{DISTRIBUTION_PARAGRAPH}}` plus 6 pills (`{{PILL_N_LABEL}}` + `{{PILL_N_STATUS}}` for N in 1..6).

### Reputation
`{{REPUTATION_PARAGRAPH}}`.

### Findings (4)
For N in 1..4: `{{FINDING_N_TITLE}}`, `{{FINDING_N_SEVERITY_CLASS}}` (`t-crit` / `t-warn`), `{{FINDING_N_SEVERITY}}` (`Critical` / `High` / `Medium`), `{{FINDING_N_WHY}}`, `{{FINDING_N_FIX}}`.

### Competitive picture
`{{COMPETITIVE_BODY}}` — short paragraph naming the local competitors that win the category search. Don't bold the competitor names; the section is informational, not promotional.

### Priority plan (4)
For N in 1..4: `{{PLAN_N_TITLE}}`, `{{PLAN_N_BODY}}`. Derive from the findings in severity order.

### Footer
`{{AUDIT_DATE}}` — ISO date the data was collected.

## What is NOT placeholdered (do not edit)

- **`<style>` block** — including the `@media(max-width:600px)` mobile pass and the `.bars` / `.bar-row` / `.bar-track` / `.bar-fill` rules. The page must render at ~390px without horizontal overflow.
- **`<head>` hints** — `<link rel="preconnect">`, `<link rel="dns-prefetch">`, `<link rel="preload">` for `app.iclosed.io` and `widget.js`.
- **`<meta name="robots" content="noindex">`** — audits are reached by QR or direct link, not search.
- **"Beyond the audit: how we work with boutique hotels"** offerings section — 14 modules across Operations and Marketing & growth, standard across every audit.
- **iClosed widget snippet** — `.iclosed-widget[data-url="…/30-min-strategy-call"]` + `widget.js` + the `"Open the booking page"` fallback link. Mirrors the live homepage `/#book` integration. If the homepage integration is ever updated, update the audits too.
