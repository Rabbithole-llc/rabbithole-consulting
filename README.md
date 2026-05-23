# Last cache-invalidate redeploy: 2026-05-23T01:59:30Z
# Rabbithole Consulting

Landing page for rabbithole.consulting — AI consulting for business owners in Puerto Rico.

Static HTML site (`index.html`, `apply.html`, `hello.html`, etc.) plus Vercel
serverless functions under `api/` for lead capture, newsletter signup, and the
inbound chat agent. Deployed on Vercel
(team: `rabbitholes-projects-2d4b7f9f`, project: `rabbithole-consulting`).

See [`WIRING.md`](WIRING.md) for the full `/apply` and `/hello` data flow,
Supabase schemas, and smoke-test recipes.

## Local development

Requires Node 18+ and the [Vercel CLI](https://vercel.com/docs/cli):

```sh
npm install
vercel dev   # serves the site + /api/* on http://localhost:3000
```

`vercel dev` reads server-side env vars from `.env` / `.env.local`
(or `vercel env pull` to seed them from the Vercel project).

### Local dev with Doppler (preferred going forward)

This repo is wired to the Doppler project `rabbithole-consulting`
(see [`DOPPLER.md`](DOPPLER.md) for the runbook). Once you're a member of
the Doppler workplace and have the [Doppler CLI](https://docs.doppler.com/docs/install-cli)
installed:

```sh
doppler login         # one-time, browser auth
doppler setup         # picks up doppler.yaml: project=rabbithole-consulting, config=dev
doppler run -- vercel dev
```

`doppler run` injects secrets as environment variables for the duration
of the command — no `.env` file required. Existing `.env` / `.env.local`
files still work and take precedence if present; Doppler is additive,
not a replacement, until Juan flips deployments over.

## Environment variables

A reference list of the server-side env vars the `api/*` functions read
lives in [`.env.example`](.env.example). The Doppler-side classification
(shared references vs repo-specific) is documented in
[`DOPPLER.md`](DOPPLER.md).
