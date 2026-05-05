# Wiring `/apply` → Supabase

This branch (`feat/wire-apply-form-to-supabase`) lands the durable backend half: a
Vercel Function at `api/leads.js`, the Supabase JS client dependency, and CORS
locked to the production origins. The client wiring (replacing `finalizeSubmit()`
in `/apply`) is documented below — the form HTML is not in this Git repo at the
time of writing, so it must be patched wherever the apply page source lives
(see "Deployment-source caveat").

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

## 3. Replace `finalizeSubmit()` in `/apply`

The current live handler is:

```js
function finalizeSubmit(){
  // For now: log + show success. Wire to a real backend (Formspree, Tally,
  // or your own endpoint) by POSTing `data` JSON here.
  console.log('Rabbithole application:', data);
  show(6);
}
```

Drop in the block below. It posts to `/api/leads`, advances to step 6 on
success, surfaces an inline error on failure, keeps the form data intact so
the user can retry, and disables the submit button while in-flight.

```js
async function finalizeSubmit(){
  const submitBtn = document.querySelector('[data-submit]');
  const errEl = document.querySelector('[data-submit-error]');
  if (errEl) { errEl.textContent = ''; errEl.hidden = true; }
  if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.busy = '1'; }

  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.ok) {
      throw new Error(payload.error || 'Could not save your application. Please try again.');
    }
    show(6);
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message || 'Something went wrong. Please try again.';
      errEl.hidden = false;
    } else {
      alert(err.message || 'Something went wrong. Please try again.');
    }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; delete submitBtn.dataset.busy; }
  }
}
```

You will also need an inline error slot somewhere near the submit button on
step 5 (or wherever final submit lives). Minimal markup:

```html
<p class="submit-error" data-submit-error hidden role="alert"></p>
```

If the existing submit button does not already carry a `data-submit`
attribute, add one (or change the selector above to whatever the button uses).

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

## 5. Deployment-source caveat (READ THIS)

When this work was done, the live `https://www.rabbithole.consulting/apply`
page was already serving in production but was **not present in this Git
repository on `main`**. The most recent GitHub push was `3293d00` on
2026-05-03, but the live `/apply` was deployed 2026-05-04 19:42:15 (UTC-4)
under deployment id `dpl_EkSWnCWdQq5oVG15zAZmwXJpEApB`. That deployment's
build output only included `api/subscribe.js` — no `/apply` source file came
through Git.

Implications:

- The `apply.html` source lives somewhere outside this repo (likely a local
  folder that someone ran `vercel deploy --prod` against, or a branch that
  was never pushed).
- If the next production deploy comes from this Git repo, it will publish
  `api/leads.js` but **will not include `/apply`** — meaning the form will
  disappear from the live site until the apply source is also committed
  here.
- Recommended fix: track down `apply.html` + `assets/chat-widget.js`, commit
  them to this repo on a sibling branch, merge that first, and only then
  apply the `finalizeSubmit()` patch and merge this branch. Otherwise you
  break /apply while wiring it.
- Vercel project / team for env-var setup:
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
