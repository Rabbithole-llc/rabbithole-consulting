// Free-audit intake — the /free-audit page POSTs here. Unlike /apply (which
// persists a fully-qualified BANT row in the consulting Supabase via leads.js),
// a free-audit request is intentionally low-friction: just enough to run the
// audit and follow up. So this handler skips the local `leads` table (whose
// columns are NOT NULL for the long form) and forwards straight to the CRM
// web-lead intake with intent='audit'. The CRM is the system of record for
// audit requests; it dedupes, creates the deal, and queues the operator's
// co-work run (task + push).
//
// Reuses the same CRM_INTAKE_URL / CRM_INTAKE_SECRET the /apply mirror already
// uses (see leads.js) — no new env required.

const crypto = require("crypto");

const ALLOWED_ORIGINS = new Set([
  "https://www.rabbithole.consulting",
  "https://rabbithole.consulting",
]);

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function isValidEmail(value) {
  return (
    typeof value === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) &&
    value.length < 320
  );
}

function clean(value) {
  return typeof value === "string" ? value.trim().slice(0, 2000) : "";
}

module.exports = async (req, res) => {
  setCors(req, res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // Defense-in-depth beyond CORS (browsers enforce CORS; curl doesn't).
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  // Honeypot — bots fill hidden fields, humans leave them empty. Silently
  // accept-and-drop so the bot gets a 200 and doesn't retry.
  if (clean(body.company_website_hp)) {
    return res.status(200).json({ ok: true });
  }

  const bizName = clean(body.biz_name);
  const email = clean(body.email);
  if (!bizName) {
    return res
      .status(400)
      .json({ ok: false, error: "Please tell us your business name." });
  }
  if (!isValidEmail(email)) {
    return res
      .status(400)
      .json({ ok: false, error: "Please enter a valid email address." });
  }

  const crmUrl = process.env.CRM_INTAKE_URL;
  const crmSecret = process.env.CRM_INTAKE_SECRET;
  if (!crmUrl || !crmSecret) {
    console.error("audit-request: CRM_INTAKE_URL / CRM_INTAKE_SECRET not configured");
    return res.status(500).json({ ok: false, error: "Server is not configured." });
  }

  const payload = {
    lead_id: crypto.randomUUID(),
    intent: "audit",
    biz_name: bizName,
    biz_website: clean(body.biz_website) || null,
    biz_industry: clean(body.biz_industry) || null,
    first_name: clean(body.first_name) || null,
    last_name: clean(body.last_name) || null,
    email,
    phone: clean(body.phone) || null,
    bottleneck: clean(body.bottleneck) || null,
    source_url: clean(body.source_url) || req.headers.referer || null,
  };

  try {
    const r = await fetch(crmUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${crmSecret}`,
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      console.error("audit-request crm-intake error:", r.status, text);
      return res
        .status(502)
        .json({ ok: false, error: "Could not submit your request. Please try again." });
    }
  } catch (err) {
    console.error(
      "audit-request handler error:",
      err && err.message ? err.message : err,
    );
    return res
      .status(500)
      .json({ ok: false, error: "Could not submit your request. Please try again." });
  }

  return res.status(200).json({ ok: true, lead_id: payload.lead_id });
};
