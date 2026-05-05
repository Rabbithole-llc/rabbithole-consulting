const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const ALLOWED_ORIGINS = new Set([
  "https://www.rabbithole.consulting",
  "https://rabbithole.consulting",
]);

const REQUIRED_FIELDS = [
  "biz_name",
  "biz_industry",
  "team_size",
  "revenue",
  "bottleneck",
  "authority",
  "timing",
  "budget",
  "first_name",
  "last_name",
  "email",
  "role",
];

const STRING_FIELDS = [
  "biz_name",
  "biz_industry",
  "biz_location",
  "biz_website",
  "team_size",
  "revenue",
  "bottleneck",
  "tried",
  "authority",
  "timing",
  "budget",
  "first_name",
  "last_name",
  "email",
  "phone",
  "role",
];

const MAX_FIELD_LEN = 4000;

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
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length < 320;
}

function pickString(body, key) {
  const v = body[key];
  if (v == null) return null;
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_FIELD_LEN);
}

function hashIp(ip) {
  if (!ip) return null;
  const first = String(ip).split(",")[0].trim();
  if (!first) return null;
  return crypto.createHash("sha256").update(first).digest("hex").slice(0, 16);
}

function sourceUrlFrom(req) {
  const referer = req.headers.referer || req.headers.referrer;
  if (typeof referer === "string" && referer) return referer.slice(0, MAX_FIELD_LEN);
  const host = req.headers.host || "";
  const url = req.url || "/";
  if (!host) return null;
  return `https://${host}${url}`.slice(0, MAX_FIELD_LEN);
}

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("leads: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return res.status(500).json({ ok: false, error: "Server is not configured." });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};

  const cleaned = {};
  for (const key of STRING_FIELDS) {
    cleaned[key] = pickString(body, key);
  }

  const missing = REQUIRED_FIELDS.filter((k) => !cleaned[k]);
  if (missing.length) {
    return res.status(400).json({ ok: false, error: "Missing required fields." });
  }

  if (!isValidEmail(cleaned.email)) {
    return res.status(400).json({ ok: false, error: "Please enter a valid email address." });
  }
  cleaned.email = cleaned.email.toLowerCase();

  const insertRow = {
    ...cleaned,
    source_url: sourceUrlFrom(req),
    user_agent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"].slice(0, MAX_FIELD_LEN) : null,
    ip_hash: hashIp(req.headers["x-forwarded-for"] || req.socket?.remoteAddress),
  };

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from("leads")
      .insert(insertRow)
      .select("id")
      .single();

    if (error) {
      console.error("leads insert error:", error.message);
      return res.status(500).json({ ok: false, error: "Could not save your application. Please try again." });
    }

    return res.status(200).json({ ok: true, lead_id: data?.id ?? null });
  } catch (err) {
    console.error("leads handler error:", err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, error: "Could not save your application. Please try again." });
  }
};
