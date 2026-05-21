# Wiring iClosed → Supabase / Telegram / Resend / PostHog

The landing page (`index.html`) no longer routes to `/apply`. All three CTAs
anchor-scroll to `#book`, where the iClosed inline widget hosts a 3-question
qualifier + calendar.

`apply.html` and `api/leads.js` are untouched and continue to work as a
fallback for anyone who has the old `/apply` URL bookmarked. No internal
links to `/apply` anymore.

---

## ✅ Already done (this branch)

- iClosed Startup account active (7-day free trial → $24/mo, seat under `rabbithole.pro.ai@gmail.com`)
- Company username claimed: `rabbithole-consulting`
- Event: **30-min Strategy Call** at `https://app.iclosed.io/e/rabbithole-consulting/30-min-strategy-call`
- Google Calendar connected (your `rabbithole.pro.ai@gmail.com` calendar receives bookings)
- Custom invitee questions added: "Business name" (short text, required) + "What's the biggest bottleneck right now?" (long text, required)
- Inline embed snippet pasted into `index.html` between the `ICLOSED:EMBED:START/END` markers
- `ICLOSED_WEBHOOK_SECRET` set in Vercel Production + Preview (this branch)
- `api/iclosed-webhook.js` deployed — accepts Zapier POSTs, mirrors the apply lead pipeline
- PR #11 open (draft): https://github.com/Rabbithole-llc/consulting/pull/11

---

## 🔑 Webhook secret (you need this for Zapier)

```
627ba1c2451307f750ea85d2bafb43fc04bd4ac3e97ad50d3a4bbca2a41875d2
```

Already in Vercel. You'll paste it as the `x-iclosed-secret` request header in your Zap.

---

## 🚦 What's left (in order)

### 1. Verify the preview deploy (1 min)

Open the Vercel preview URL — you'll hit Vercel SSO once, click through (you're the project owner so it's a single click):
```
https://rabbithole-consulting-277dtyqf3-rabbitholes-projects-2d4b7f9f.vercel.app/#book
```

Confirm the iClosed widget renders inline (form on left, calendar on right). If it loads — proceed. If not, ping me.

### 2. Refine the iClosed event (~3 min, inside iClosed dashboard)

Currently the form opens with **Phone Number** as required Q1. That's iClosed's default and probably hurts conversion. Two quick changes:

1. **Go to** iClosed → AI Scheduler → Events → click **30-min Strategy Call**
2. **Click "Invitee Questions"** in the sidebar
3. **Move "Business name" and "What's the biggest bottleneck right now?" to Primary**
   - Drag them above Phone/Name (use the `≡` handle on the left of each question)
   - These become the 2 Primary questions, captured as "Potential" lead immediately
4. **Make Phone optional** — click the pencil icon on the Phone Number question → toggle Required OFF. Email is still required, so contact info is preserved.
5. **Click Save & Continue**

Optional: change Location from "Phone Call" → "Google Meet" now that your calendar is connected. Event Details tab → Location → Google Meet. iClosed will auto-generate Meet links per booking.

### 3. Set up the Zapier zap (~5 min)

Sign up for Zapier (Free tier covers 100 tasks/mo): https://zapier.com/sign-up
Use Google SSO with `rabbithole.pro.ai@gmail.com` — fastest.

After signup, create a new Zap:

**Trigger:**
- App: **iClosed**
- Event: **New Booking** (fires only when a slot is actually picked, not on form fill)
- Account: connect with the same iClosed login you just used
- Test: should pull a sample booking (or you may need to do step 4 below first to seed one)

**Action:**
- App: **Webhooks by Zapier**
- Event: **POST**
- Configure:

| Field | Value |
| --- | --- |
| URL | `https://rabbithole.consulting/api/iclosed-webhook` |
| Payload Type | `json` |
| Data (JSON body) | See mapping below |
| Wrap Request In Array | No |
| Unflatten | No |
| File | (leave blank) |
| Basic Auth | (leave blank) |
| Headers | `x-iclosed-secret: 627ba1c2451307f750ea85d2bafb43fc04bd4ac3e97ad50d3a4bbca2a41875d2` <br> `Content-Type: application/json` |

**Data (JSON body) — map iClosed fields to these keys:**

| Webhook key | Pull from iClosed trigger |
| --- | --- |
| `business_name` | Answer to "Business name" question |
| `bottleneck` | Answer to "What's the biggest bottleneck right now?" |
| `email` | Invitee Email |
| `phone` | Invitee Phone |
| `full_name` | Invitee Name (will be split into first/last) |
| `scheduled_at` | Event Start Time |
| `iclosed_lead_id` | Booking ID |
| `iclosed_booking_url` | Booking URL (if iClosed exposes it) |

Click **Test Action** — you should see HTTP 200 with `{ ok: true, lead_id: "..." }`.

Turn the Zap ON.

### 4. Smoke test (~2 min)

1. Open the preview URL `/#book` (or after merge, `rabbithole.consulting/#book`)
2. Fill the form with a real-looking test email (e.g. `austin+test@rabbithole.consulting`) and book any open slot
3. Verify all four channels fire:
   - **Supabase**: new row in `leads` table (look for placeholder `(iClosed lead — qualify on call)` in the BANT columns)
   - **Telegram**: message starting `📅 *iClosed booking*` in your leads chat
   - **Email**: subject `📅 iClosed booking: ...` to `NOTIFICATION_TO_EMAILS`
   - **PostHog**: `iclosed booking` event under the test email
4. Cancel the booking in Google Calendar / iClosed so your real calendar doesn't fill with tests

### 5. Ship it

1. Mark PR #11 ready for review (un-draft on GitHub)
2. Merge to `main` — Vercel auto-deploys to `rabbithole.consulting` production
3. Smoke test once more on the production URL

---

## Reference

### Existing Vercel env vars (no changes needed)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` → writes `leads` table
- `RESEND_API_KEY`, `NOTIFICATION_TO_EMAILS` → emails the team
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_LEADS_CHAT_ID` → pings the leads chat
- `POSTHOG_API_KEY`, `POSTHOG_HOST` → identifies + captures `iclosed booking`

### New Vercel env var (already set)
- `ICLOSED_WEBHOOK_SECRET` → shared with Zapier in the request header

### Gotchas

- **Required-but-not-collected columns** in the `leads` table (team_size, revenue, authority, timing, budget, role) are filled with the literal string `(iClosed lead — qualify on call)` so the insert never violates NOT NULL. If you'd rather have them nullable, run an `alter table` in Supabase to drop NOT NULL and adjust the endpoint.
- **Email is hard-required in the schema** (`email text not null`). If a lead only gives a phone number, the endpoint stores `no-email+<timestamp>@iclosed.placeholder` so the row still inserts. Telegram + Resend still show the real phone. You'd reply via SMS for phone-only leads.
- **Seat is under your email, not Juan's.** Bookings land in *your* `rabbithole.pro.ai@gmail.com` calendar. If you want them on Juan's calendar, add Juan as a host (iClosed → 30-min Strategy Call → Hosts → + Invite Users → enter Juan's email → Juan does OAuth on his end).
