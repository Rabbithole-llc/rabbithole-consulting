# Wiring iClosed → Supabase / Telegram / Resend / PostHog

The landing page (`index.html`) no longer routes to `/apply`. All three CTAs
("Apply Now" nav button, hero "I'm Ready To Scale", mid-page "I'm Ready To
Scale", and the final-section heading) anchor-scroll to `#book`, where an
iClosed inline widget hosts a 3-question qualifier + calendar.

`apply.html` and `api/leads.js` are untouched and continue to work as a
fallback for anyone who has the old `/apply` URL bookmarked. There are no
internal links to `/apply` anymore.

This doc covers what you need to do after iClosed signup so the new flow
reaches Supabase, Telegram, Resend, and PostHog — i.e. parity with the old
form.

---

## 1. Sign up for iClosed Startup

- Plan: **Startup, $24/seat/month**, 7-day free trial
- URL: https://www.iclosed.io/pricing
- **Register the seat under Juan's name / email.** Juan is the appointment
  taker on the iClosed side.
- After signup, connect the Google Calendar Juan books from (the same one
  feeding `calendly.com/team-rabbithole/30min` if it's a round-robin
  calendar — or just Juan's calendar directly if the round-robin happens in
  iClosed).

## 2. Build the funnel (form + scheduler)

Inside iClosed, create a new Funnel / Lift widget. Configure three steps:

| Step | Field | Type | Required |
| --- | --- | --- | --- |
| 1 | Business name | Short text | Yes |
| 2 | What's the biggest bottleneck right now? | Long text (textarea) | Yes |
| 3 | Email or phone (one) | Email + Phone inputs, mark at least one required in iClosed's logic settings | Yes (at least one) |

After step 3, point iClosed at your scheduler:

- Either **import the existing Calendly** (`team-rabbithole/30min`) via
  iClosed's Calendly Import — keeps your existing round-robin between you
  and Juan, plus all your reminder rules.
- Or use iClosed's native scheduler pointed at Juan's calendar. Native is
  what unlocks iClosed's reminders/SMS features; Calendly import keeps your
  setup unchanged.

Recommendation: **import Calendly to start**. You can migrate later.

## 3. Paste the embed snippet into the landing page

In iClosed → Funnel settings → Embed, copy the **inline embed** snippet (not
the popup/Lift CTA variant — we want it inline in the dark `#book`
section).

In `index.html`, replace the placeholder block:

```html
<!-- ICLOSED:EMBED:START -->
<div id="iclosed-embed-placeholder" class="iclosed-placeholder">
  ...placeholder copy...
</div>
<!-- ICLOSED:EMBED:END -->
```

with the snippet iClosed gave you:

```html
<!-- ICLOSED:EMBED:START -->
<!-- paste iClosed inline embed snippet here -->
<!-- ICLOSED:EMBED:END -->
```

Keep the `iclosed-frame` div wrapper around it — it provides the white
rounded card on the dark final section. The wrapper has `min-height:420px`
so the page doesn't reflow once the widget mounts.

If iClosed only offers a popup-style Lift widget on the Startup plan, leave
the placeholder copy as a fallback and have the widget's CTA button trigger
the popup. The three landing-page CTAs already anchor-scroll to `#book` so
the user sees both the placeholder and the popup trigger.

## 4. Set the webhook secret in Vercel

The new endpoint `api/iclosed-webhook.js` requires a shared secret on every
inbound POST. Generate one and add to Vercel:

```sh
# generate a strong secret locally:
openssl rand -hex 32

# then in the rh-fresh project on Vercel:
vercel env add ICLOSED_WEBHOOK_SECRET production
vercel env add ICLOSED_WEBHOOK_SECRET preview
```

Paste the generated hex string when prompted. **Save a copy** — you'll need
it for the Zapier step below.

The endpoint already reuses these existing env vars (no new setup needed):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` → writes `leads` table
- `RESEND_API_KEY`, `NOTIFICATION_TO_EMAILS` → emails the team
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_LEADS_CHAT_ID` → pings the leads chat
- `POSTHOG_API_KEY`, `POSTHOG_HOST` → identifies + captures `iclosed booking`

## 5. Set up the Zapier zap

Zapier Free covers 100 tasks/month. One Zap, one task per booking.

**Trigger:** iClosed → "New Booking" (or "New Lead", whichever fires when the
calendar slot is picked — you want the post-booking event so we only
notify on actual booked calls, not abandoned forms).

**Action:** Webhooks by Zapier → **POST**

| Field | Value |
| --- | --- |
| URL | `https://rabbithole.consulting/api/iclosed-webhook` |
| Payload Type | JSON |
| Wrap Request In Array | No |
| Unflatten | No |
| Headers | `x-iclosed-secret: <paste the secret you generated in step 4>` <br> `Content-Type: application/json` |

**Data (JSON body):** map the iClosed trigger fields to these keys:

| Webhook key (what we send) | iClosed source field |
| --- | --- |
| `business_name` | Business name answer from step 1 |
| `bottleneck`    | Bottleneck answer from step 2 |
| `email`         | Email field (leave blank if user gave phone only) |
| `phone`         | Phone field (leave blank if user gave email only) |
| `full_name`     | Lead's name from iClosed (will be split into first/last) |
| `scheduled_at`  | Booking time / event start (ISO string preferred) |
| `iclosed_lead_id` | iClosed lead ID |
| `iclosed_booking_url` | Direct link to the booking inside iClosed |
| `industry`      | (optional) leave blank — we don't ask for it |

The endpoint also accepts these legacy keys for flexibility: `biz_name`,
`biz_industry`, `biz_location`, `biz_website`, `name`, `first_name`,
`last_name`, `role`. Most you don't need to map.

**Test the Zap** from Zapier's test step. You should see:

1. HTTP 200 from the endpoint with `{ ok: true, lead_id: "..." }`
2. A new row in the Supabase `leads` table (look for placeholder
   `(iClosed lead — qualify on call)` values in the BANT/team/revenue
   columns — those are intentional, since the new flow doesn't ask)
3. A Telegram message in the leads chat starting with `📅 *iClosed booking*`
4. An email to `NOTIFICATION_TO_EMAILS` with subject `📅 iClosed booking: ...`
5. A `iclosed booking` event in PostHog under the lead's email

## 6. Verify the end-to-end live

After publishing the index.html change:

1. Open `https://rabbithole.consulting/#book` in an incognito tab.
2. Submit the iClosed form with a real-looking test email and book a slot.
3. Check the same four destinations as the Zapier test above.
4. (Optional) cancel/reschedule the booking via Calendly so your real
   calendar doesn't fill up with tests.

## 7. After you're satisfied

Once the new flow is converting, you can:

- Add `noindex` to `apply.html` (already noindex'd in its `<meta>`).
- Drop the apply pipeline entirely: delete `apply.html`, `api/leads.js`,
  the `subscribe.js` if unused, and the dependencies that only those need.
- Or keep apply.html as a redundant backup — small footprint, no
  conversion impact since nothing on the landing page links to it now.

## Notes & gotchas

- **iClosed Startup has no native webhooks.** That's why we go via Zapier.
  Upgrading to Business ($120/seat/mo) would let iClosed POST directly to
  `/api/iclosed-webhook` and skip Zapier entirely — but that's $96/seat
  more than we need for current volume.
- **Required-but-not-collected columns** in the `leads` table (team_size,
  revenue, authority, timing, budget, role) are filled with the literal
  string `(iClosed lead — qualify on call)` so the insert never violates
  NOT NULL. If you'd rather have them nullable, run an `alter table` in
  Supabase to drop the NOT NULL on those columns and update the endpoint
  to insert real `null`s.
- **Email is a hard requirement in the schema** (`email text not null`).
  If a lead only gives a phone number, the endpoint stores
  `no-email+<timestamp>@iclosed.placeholder` so the row still inserts.
  The Telegram and Resend notifications still show the real phone. You'll
  reply via SMS instead of email for phone-only leads.
- **CTA copy** — the nav CTA went from "Apply Now" to "Book a Call". Hero
  and mid-page CTAs still say "I'm Ready To Scale". Change in `index.html`
  if you want different copy.
