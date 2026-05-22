# Doppler Runbook — `rabbithole-consulting`

Status: **scaffolding only**. The repo is wired to Doppler locally
(`doppler.yaml` + `doppler run -- vercel dev`), but **no deployments use
Doppler yet**. Existing Vercel-managed env vars and local `.env*` files
remain authoritative until Juan flips the Doppler→Vercel integration.

This is the second repo in Phase 1 of the RabbitHole secrets-management
transition. Canary: `rabbithole-audit-engine` (Railway). This repo
deploys on **Vercel** — see § 4 for the integration recipe.

---

## 1. Project layout

Two Doppler projects are involved:

| Doppler project | Purpose | Configs |
| --- | --- | --- |
| `rabbithole-shared` | Cross-repo secrets (API keys, central infra) | `dev` / `stg` / `prd` |
| `rabbithole-consulting` | Secrets specific to this repo | `dev` / `stg` / `prd` |

Vercel environments map to the `rabbithole-consulting` configs:

| Vercel env | Doppler config |
| --- | --- |
| Development (local `vercel dev`) | `dev` |
| Preview | `stg` |
| Production | `prd` |

This repo's `doppler.yaml` pins the local default to `rabbithole-consulting / dev`.
Override per-shell with `doppler setup --config stg` or
`doppler run --config prd -- …` when you need to inspect another env.

---

## 2. Key classification

The `api/*.js` functions reference the following env vars (greppable via
`process.env.*`). Classification below is by *source of truth* in Doppler.

> **Never put real values in this file or in any committed file.** This
> section is **key names only**.

### 2.1 Shared references — pulled from `rabbithole-shared`

Inside the `rabbithole-consulting` Doppler project, these keys are stored
as Doppler **secret references** using the syntax
`${rabbithole-shared.<config>.<KEY>}`:

| Key | Used by | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | `api/chat.js` | Already in `rabbithole-shared`. Reference, do not duplicate. |

**Conditional shared candidates — see § 3 for the Supabase question:**

| Key | Used by | Status |
| --- | --- | --- |
| `SUPABASE_URL` | `api/leads.js`, `api/sales-agent-lead.js` | **Verify project first** (see § 3). Reference shared only if this repo points at the merged `rabbithole-data` project. |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/leads.js`, `api/sales-agent-lead.js` | Same as above. Service-role key is **per-Supabase-project**; the shared one only fits if the URL matches. |

Currently in `rabbithole-shared` but **not used by this repo** — do
**not** add references for these:

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`

### 2.2 Repo-specific secrets — live in `rabbithole-consulting`

True secrets that belong only to this repo:

| Key | Used by | Sensitivity |
| --- | --- | --- |
| `NOTION_API_KEY` | `api/subscribe.js` | Secret |
| `NOTION_NEWSLETTER_DB_ID` | `api/subscribe.js` | Private config (DB UUID) |
| `RESEND_API_KEY` | `api/leads.js`, `api/sales-agent-lead.js` | Secret. Note: `.env.example` mentions it is "already provisioned for the audit-complete flow; reused here." If we later promote it to `rabbithole-shared`, swap this entry for a shared reference. For now, keep repo-local. |
| `TELEGRAM_BOT_TOKEN` | `api/leads.js`, `api/sales-agent-lead.js` | Secret (bot: `@ClinicGTMbot`) |
| `TELEGRAM_LEADS_CHAT_ID` | `api/leads.js`, `api/sales-agent-lead.js` | Private routing id |
| `CRM_INTAKE_URL` | `api/leads.js` | Private endpoint URL |
| `CRM_INTAKE_SECRET` | `api/leads.js` | Secret (HMAC / bearer for CRM mirror) |

Repo-specific config that is **not really a secret** but lives next to
the secrets so everything ships from one source:

| Key | Used by | Notes |
| --- | --- | --- |
| `NOTIFICATION_TO_EMAILS` | `api/leads.js`, `api/sales-agent-lead.js` | Comma-separated email list. Defaults to `goodgameconsultingllc@gmail.com` if unset. |
| `POSTHOG_API_KEY` | `api/leads.js`, `api/sales-agent-lead.js`, `api/subscribe.js` | PostHog **project** key — publishable per PostHog's docs. Treated as env var because it varies across envs. |
| `POSTHOG_HOST` | same as above | Defaults to `https://us.i.posthog.com`. |

### 2.3 Public / build-time vars

**None.** This is a static-HTML site, not Next.js. There are no
`NEXT_PUBLIC_*` or `VITE_*` variables. The PostHog *frontend* project
key (`phc_kmXw…`) is hardcoded directly in the HTML files — it is a
public ingest key and was not migrated.

---

## 3. Supabase finding — REQUIRES JUAN'S VERIFICATION

Per the project inventory, this repo *may* point at the legacy `ops`
Supabase project rather than the merged `rabbithole-data` Supabase
project. I could not definitively determine which from the code alone
(the Supabase URL is read from env at runtime; no project ref is
hardcoded anywhere in the repo).

**To verify, before populating Doppler:**

```sh
# from a logged-in environment (NOT this scaffolding session)
vercel link --scope rabbitholes-projects-2d4b7f9f --project rabbithole-consulting
vercel env pull .env.verify.local
grep ^SUPABASE_URL .env.verify.local
rm .env.verify.local
```

Compare the project ref in `SUPABASE_URL` (the `<ref>` in
`https://<ref>.supabase.co`) against the known refs of the `ops` and
`rabbithole-data` Supabase projects.

- **If it matches `rabbithole-data`** → put `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` into `rabbithole-shared` (if not already
  there with the right project) and reference them from
  `rabbithole-consulting`.
- **If it matches `ops`** → keep `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` as **repo-specific** in the
  `rabbithole-consulting` project. **Do not reference shared**, because
  the shared service-role key would be for a different Supabase project
  and would silently fail (or worse, write to the wrong DB).

This is the single biggest "do not get wrong" item for this repo's
migration.

---

## 4. Vercel integration recipe (LEAVE DISABLED)

We are **not** flipping this in this PR. Steps documented so Juan can
execute when ready.

### 4.1 Prerequisites

- Doppler workplace admin access.
- Vercel team admin access for `rabbitholes-projects-2d4b7f9f`.
- All keys from § 2 populated in
  `rabbithole-consulting` (`dev` / `stg` / `prd`), with shared
  references resolving in `rabbithole-shared` (`dev` / `stg` / `prd`).

### 4.2 Steps (Doppler dashboard)

1. Doppler dashboard → project `rabbithole-consulting` → **Integrations** → **Add Integration** → **Vercel**.
2. Authorize the Doppler Vercel app against the
   `rabbitholes-projects-2d4b7f9f` Vercel team if not already authorized.
3. Pick the **Vercel project** `rabbithole-consulting`.
4. Create **three separate syncs** — one per Vercel environment — and
   leave each one **disabled** until § 4.3 verification passes:

   | Doppler config | Vercel environment | Initial state |
   | --- | --- | --- |
   | `dev` | Development | Disabled |
   | `stg` | Preview | Disabled |
   | `prd` | Production | Disabled |

5. For each sync, choose the import strategy:
   - **Prefer Doppler** (Doppler-managed keys overwrite Vercel values on every sync).
   - This is the only option that gives Doppler a clean ownership story. The first sync will overwrite the current Vercel env vars — confirm that the Doppler configs are correct first.

### 4.3 Verification before enabling sync

1. Pull current Vercel env vars: `vercel env pull .env.preflight.local`.
2. Run `doppler secrets --config prd --only-names` and compare against
   the keys in `.env.preflight.local`. The Doppler list must be a
   **superset** of the Vercel list (anything Vercel has but Doppler
   doesn't will be **deleted** on first sync).
3. Spot-check a couple of values manually inside the Doppler dashboard
   (do not export, do not print). Especially: `SUPABASE_URL` must point
   at the same Supabase project Vercel currently uses (see § 3).
4. Delete `.env.preflight.local`.

### 4.4 Enable production last

Suggested flip order, one at a time, with a manual `/api/leads` smoke
test (see `WIRING.md` § 4) between each:

1. Enable **`dev` → Development** sync. Run a local `vercel dev`
   without Doppler in the shell to confirm Vercel-side dev env still
   loads correctly. (Doppler is not driving local; this just confirms
   the Vercel dev environment.)
2. Enable **`stg` → Preview** sync. Push a throwaway branch, open a
   preview deploy, exercise `/apply` and `/hello`.
3. Enable **`prd` → Production** sync. Watch a real deploy. Confirm
   `/api/leads`, `/api/sales-agent-lead`, `/api/subscribe`, and
   `/api/chat` all respond 200 against production secrets.

### 4.5 Rollback

If anything breaks after enabling production sync:

1. In Doppler → Integrations → Vercel → **disable** the prd sync.
   This stops further overwrites but does **not** restore previous
   Vercel values.
2. Restore individual keys via the Vercel dashboard or
   `vercel env add <KEY> production`. Keep a pre-sync snapshot from
   § 4.3 step 1 *out-of-band* (1Password / Doppler itself) so the
   rollback values are recoverable.

---

## 5. Pre-existing `.env*` files

Per the migration plan, this PR does **not** delete or rewrite:

- `.env.example` — kept as the human-readable reference of which keys
  the app reads.
- Any local `.env` / `.env.local` developers have — still honored by
  `vercel dev` (and `doppler run` only injects, it does not strip
  existing env).

These can be retired once Doppler-Vercel sync is enabled for all three
environments and at least one full production cycle has been observed
clean.

---

## 6. Differences vs the `rabbithole-audit-engine` canary

| Concern | Audit engine (Railway) | This repo (Vercel) |
| --- | --- | --- |
| Deploy integration | Doppler → Railway sync | Doppler → Vercel sync |
| Number of env scopes | 1 per env (dev/stg/prd) | 3 syncs total (one per Vercel env) |
| Build-time vs runtime vars | All runtime | All runtime — no `NEXT_PUBLIC_*` because this is not Next.js |
| Shared API keys actually used | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_*` | Only `ANTHROPIC_API_KEY` (and *maybe* `SUPABASE_*` — see § 3) |
| Repo-specific surface | Smaller (LLM + Supabase) | Larger (Notion, Resend, Telegram, PostHog, CRM intake) |
| Risk of breakage on flip | Low — single deploy target | Higher — three Vercel envs, one is live prod traffic |
