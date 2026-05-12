# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into Rabbithole Consulting's Node.js API layer. Two serverless route handlers (`api/leads.js` and `api/subscribe.js`) were instrumented with the `posthog-node` SDK. Each handler initializes a short-lived PostHog client configured for Vercel's serverless environment (`flushAt: 1`, `flushInterval: 0`) and uses `captureImmediate` + `shutdown` to guarantee events are sent before the function exits. User identification is performed server-side on every successful action, linking events to a person profile by email. Unhandled errors are forwarded to PostHog's error tracking via `captureException`. The `api/chat.js` handler uses Vercel's Edge Runtime, which is incompatible with the Node.js SDK and was intentionally left uninstrumented.

| Event | Description | File |
|---|---|---|
| `lead submitted` | A prospect submitted the strategy call application form. Captured after successful Supabase insert. Includes BANT qualifiers, business details, and source URL. User is identified with name, email, role, and phone. | `api/leads.js` |
| `newsletter subscribed` | A visitor subscribed to the Rabbithole newsletter. Captured only for net-new subscribers (duplicates are skipped). User is identified with email. | `api/subscribe.js` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1575315)
- [Lead submissions over time](/insights/i4VIVamx)
- [Newsletter subscriptions over time](/insights/mHLCDQ1e)
- [Newsletter to lead conversion funnel](/insights/T2sAziMs)
- [Leads by industry](/insights/q4e4COfh)
- [Total leads (last 30 days)](/insights/Vg9BtkZl)

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
