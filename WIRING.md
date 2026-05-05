# Wiring `/apply` → Supabase

This branch (`feat/wire-apply-form-to-supabase`) lands the full
end-to-end wiring: the `/apply` page (`apply.html` + `assets/chat-widget.{js,css}`)
recovered from the live deployment, a Vercel Function at `api/leads.js` that
inserts into Supabase, the `@supabase/supabase-js` dependency, CORS locked to
the production origins, and the `finalizeSubmit()` handler patched to POST
to `/api/leads` with proper error handling. Merging this branch is safe —
`/apply` redeploys from Git without disappearing, and submissions persist
once the env vars and Supabase table below are in place.

## 1. Set Vercel env vars

Both production and preview need the Supabase service-role key. The function
will return 500 with `Server is not configured.` if either is missing.

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API → `service_role`. Server-only. Never ship to the browser. |

Vercel CLI (project: `rabbithole-consulting`, team: `rabbitholes-projects-2d4b7f9f`):

```sh
vercel link --scope rabbitholes-projects-2d4b7f9f --project rabbithole-consulting
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# repeat for `preview` if you want preview deploys to write to the same DB
```

## 2. Supabase `leads` table

The function inserts into `public.leads`. The expected columns:

```sql
create table public.leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  biz_name      text not null,
  biz_industry  text not null,
  biz_location  text,
  biz_website   text,
  team_size     text not null,
  revenue       text not null,
  bottleneck    text not null,
  tried         text,
  authority     text not null,
  timing        text not null,
  budget        text not null,
  first_name    text not null,
  last_name     text not null,
  email         text not null,
  phone         text,
  role          text not null,
  source_url    text,
  user_agent    text,
  ip_hash       text
);
```

The service-role key bypasses RLS, so RLS policies on this table do not affect
the function. Keep RLS enabled with no anon policy so the table is unreachable
from the browser.

## 3. `finalizeSubmit()` is wired (already in this branch)

`apply.html` ships in this branch with `finalizeSubmit()` already POSTing to
`/api/leads`. The placeholder `console.log` is gone. On success the user sees
step 6 (Calendly link). On failure they see the server's error inline in the
`#submitError` slot above the submit button, the button re-enables, and the
form data is preserved so they can retry. Both `submitApp()` (qualified) and
`forceSubmit()` ("Apply Anyway") call into the same handler.

If you ever need to lift the snippet into a different page, the wired
function and its companion error slot are at `apply.html` lines ~621 and
~790. The button uses `id="submitBtn"`, the error slot uses
`id="submitError"`.

## 4. Local smoke test

```sh
# from repo root, after `npm i`
vercel dev   # serves /api/leads on http://localhost:3000

# 4a. Preflight from a real origin
curl -i -X OPTIONS http://localhost:3000/api/leads \
  -H 'Origin: https://www.rabbithole.consulting' \
  -H 'Access-Control-Request-Method: POST'

# 4b. Successful POST (requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in
# .env.local or `vercel env pull`). Use a throwaway Supabase project — do NOT
# point this at production.
curl -i -X POST http://localhost:3000/api/leads \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://www.rabbithole.consulting' \
  --data '{
    "biz_name": "Test Co",
    "biz_industry": "Hospitality",
    "biz_location": "PR",
    "biz_website": "https://example.com",
    "team_size": "2–5",
    "revenue": "$250k–$1M",
    "bottleneck": "Manual ops",
    "tried": "Zapier, ChatGPT",
    "authority": "Yes, solo decision-maker",
    "timing": "ASAP",
    "budget": "Yes, if ROI is clear",
    "first_name": "Test",
    "last_name": "User",
    "email": "test+wire@example.com",
    "phone": "555-0100",
    "role": "Owner"
  }'
# expect: 200 { "ok": true, "lead_id": "<uuid>" }

# 4c. Validation failures
curl -i -X POST http://localhost:3000/api/leads \
  -H 'Content-Type: application/json' \
  --data '{"biz_name":"X"}'
# expect: 400 { "ok": false, "error": "Missing required fields." }
```

## 5. Deployment-source history (resolved)

Earlier, the live `https://www.rabbithole.consulting/apply` page was serving
in production from a Vercel deployment whose source had never been committed
to this Git repo — it had been pushed via direct `vercel deploy` from a
local working copy. That meant the next Git-sourced production deploy
would have *removed* `/apply` from the live site.

Resolved in commit `dbc2103`: `apply.html`, `assets/chat-widget.js`, and
`assets/chat-widget.css` were recovered byte-for-byte from the live
deployment via curl and committed here. Git is now the source of truth.
The next production deploy from `main` will include `/apply` and will not
regress the page.

Vercel project / team for env-var setup:

- team: `rabbitholes-projects-2d4b7f9f` (Rabbithole's projects)
- project: `rabbithole-consulting`
- prod alias: `https://www.rabbithole.consulting`

## 6. Privacy notes

- Raw IPs are never stored. `ip_hash` is the first 16 hex chars of
  `sha256(x-forwarded-for-first-hop)`. Truncated to make rainbow-table
  attacks costly while preserving rough dedupe / abuse-detection signal.
- The function does not echo input back to the client on success — only the
  `lead_id`. Validation errors return generic messages, not field traces.
- Service-role key is read from env at request time inside the handler; it
  is never serialized into responses.
