const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { sendTelegramMessage, renderLeadTelegramMessage } = require("./_lib/telegram");
const { PostHog } = require("posthog-node");

function getPostHog() {
  return new PostHog(process.env.POSTHOG_API_KEY, {
    host: process.env.POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
    enableExceptionAutocapture: true,
  });
}

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

const NOTIFICATION_FROM = "Rabbithole <team@mail.rabbithole.consulting>";
const NOTIFICATION_DEFAULT_TO = "goodgameconsultingllc@gmail.com";
const ADMIN_LEAD_BASE_URL = "https://rabbithole-ops.vercel.app/admin/leads";

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeSubject(s) {
  return String(s == null ? "" : s).replace(/[\r\n\t]+/g, " ").slice(0, 200);
}

function parseRecipients(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function renderLeadEmail(lead, leadId) {
  const adminUrl = leadId ? `${ADMIN_LEAD_BASE_URL}/${encodeURIComponent(leadId)}` : null;
  const subject = safeSubject(`🟢 New Rabbithole lead: ${lead.biz_name || "(unnamed)"} (${lead.biz_industry || "—"})`);

  const row = (label, value) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#666;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>` +
    `<td style="padding:6px 0;color:#111;word-break:break-word">${value == null || value === "" ? "<span style='color:#aaa'>—</span>" : escapeHtml(value)}</td></tr>`;

  const bantRow = (label, value) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#444;vertical-align:top;white-space:nowrap;font-weight:600">${escapeHtml(label)}</td>` +
    `<td style="padding:6px 0;color:#111;font-weight:600">${value == null || value === "" ? "<span style='color:#aaa;font-weight:400'>—</span>" : escapeHtml(value)}</td></tr>`;

  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ");

  const html = `<!doctype html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;background:#f6f6f6;margin:0;padding:24px">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;padding:28px 32px;border:1px solid #eee">
  <h2 style="margin:0 0 4px;font-size:20px">New Rabbithole lead</h2>
  <p style="margin:0 0 20px;color:#666;font-size:14px">${escapeHtml(lead.biz_name || "(unnamed business)")} · ${escapeHtml(lead.biz_industry || "—")}</p>

  <h3 style="margin:18px 0 8px;font-size:14px;text-transform:uppercase;color:#888;letter-spacing:.04em">Primary contact</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    ${row("Name", fullName)}
    ${row("Role", lead.role)}
    ${row("Email", lead.email)}
    ${row("Phone", lead.phone)}
  </table>

  <h3 style="margin:24px 0 8px;font-size:14px;text-transform:uppercase;color:#888;letter-spacing:.04em">Business</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    ${row("Name", lead.biz_name)}
    ${row("Industry", lead.biz_industry)}
    ${row("Location", lead.biz_location)}
    ${row("Website", lead.biz_website)}
    ${row("Team size", lead.team_size)}
    ${row("Revenue", lead.revenue)}
  </table>

  <h3 style="margin:24px 0 8px;font-size:14px;text-transform:uppercase;color:#c44a00;letter-spacing:.04em">BANT</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px;background:#fff8f0;border:1px solid #f3d7b5;border-radius:6px;padding:8px 12px">
    ${bantRow("Authority", lead.authority)}
    ${bantRow("Timing", lead.timing)}
    ${bantRow("Budget", lead.budget)}
  </table>

  <h3 style="margin:24px 0 8px;font-size:14px;text-transform:uppercase;color:#888;letter-spacing:.04em">Bottleneck</h3>
  <p style="margin:0;padding:12px 14px;background:#fafafa;border:1px solid #eee;border-radius:6px;white-space:pre-wrap;font-size:14px;line-height:1.5">${escapeHtml(lead.bottleneck) || "<span style='color:#aaa'>—</span>"}</p>

  ${lead.tried ? `
  <h3 style="margin:24px 0 8px;font-size:14px;text-transform:uppercase;color:#888;letter-spacing:.04em">Tried already</h3>
  <p style="margin:0;padding:12px 14px;background:#fafafa;border:1px solid #eee;border-radius:6px;white-space:pre-wrap;font-size:14px;line-height:1.5">${escapeHtml(lead.tried)}</p>
  ` : ""}

  ${adminUrl ? `<p style="margin:28px 0 0"><a href="${escapeHtml(adminUrl)}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">Open in Rabbithole Ops →</a></p>` : ""}
  ${lead.source_url ? `<p style="margin:18px 0 0;font-size:12px;color:#999">Source: ${escapeHtml(lead.source_url)}</p>` : ""}
</div>
</body>
</html>`;

  const lines = [
    `New Rabbithole lead: ${lead.biz_name || "(unnamed)"} (${lead.biz_industry || "—"})`,
    "",
    "PRIMARY CONTACT",
    `  Name:     ${fullName || "—"}`,
    `  Role:     ${lead.role || "—"}`,
    `  Email:    ${lead.email || "—"}`,
    `  Phone:    ${lead.phone || "—"}`,
    "",
    "BUSINESS",
    `  Name:     ${lead.biz_name || "—"}`,
    `  Industry: ${lead.biz_industry || "—"}`,
    `  Location: ${lead.biz_location || "—"}`,
    `  Website:  ${lead.biz_website || "—"}`,
    `  Team:     ${lead.team_size || "—"}`,
    `  Revenue:  ${lead.revenue || "—"}`,
    "",
    "BANT",
    `  Authority: ${lead.authority || "—"}`,
    `  Timing:    ${lead.timing || "—"}`,
    `  Budget:    ${lead.budget || "—"}`,
    "",
    "BOTTLENECK",
    lead.bottleneck ? `  ${lead.bottleneck.replace(/\r?\n/g, "\n  ")}` : "  —",
  ];
  if (lead.tried) {
    lines.push("", "TRIED ALREADY", `  ${lead.tried.replace(/\r?\n/g, "\n  ")}`);
  }
  if (adminUrl) lines.push("", `Admin: ${adminUrl}`);
  if (lead.source_url) lines.push("", `Source: ${lead.source_url}`);
  const text = lines.join("\n");

  return { subject, html, text };
}

async function notifyNewLead(lead, leadId) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("leads notify: RESEND_API_KEY not set, skipping notification");
    return;
  }
  const to = parseRecipients(process.env.NOTIFICATION_TO_EMAILS || NOTIFICATION_DEFAULT_TO);
  if (!to.length) {
    console.error("leads notify: NOTIFICATION_TO_EMAILS resolved to empty list, skipping");
    return;
  }

  const { Resend } = require("resend");
  const resend = new Resend(apiKey);
  const { subject, html, text } = renderLeadEmail(lead, leadId);

  const result = await resend.emails.send({
    from: NOTIFICATION_FROM,
    to,
    subject,
    html,
    text,
    reply_to: lead.email || undefined,
  });

  if (result && result.error) {
    throw new Error(result.error.message || "Resend returned error");
  }
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

    const leadId = data?.id ?? null;

    const posthog = getPostHog();
    try {
      const fullName = [insertRow.first_name, insertRow.last_name].filter(Boolean).join(" ");
      posthog.identify({
        distinctId: insertRow.email,
        properties: {
          $set: {
            email: insertRow.email,
            name: fullName || undefined,
            role: insertRow.role || undefined,
            phone: insertRow.phone || undefined,
          },
        },
      });
      await posthog.captureImmediate({
        distinctId: insertRow.email,
        event: "lead submitted",
        properties: {
          lead_id: leadId,
          biz_name: insertRow.biz_name,
          biz_industry: insertRow.biz_industry,
          biz_location: insertRow.biz_location,
          biz_website: insertRow.biz_website,
          team_size: insertRow.team_size,
          revenue: insertRow.revenue,
          authority: insertRow.authority,
          timing: insertRow.timing,
          budget: insertRow.budget,
          source_url: insertRow.source_url,
        },
      });
    } catch (phErr) {
      console.error("leads posthog error:", phErr && phErr.message ? phErr.message : phErr);
    } finally {
      await posthog.shutdown();
    }

    try {
      await notifyNewLead(insertRow, leadId);
    } catch (notifyErr) {
      console.error(
        "leads notify error:",
        notifyErr && notifyErr.message ? notifyErr.message : notifyErr
      );
    }

    try {
      const tgRes = await sendTelegramMessage({
        token: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_LEADS_CHAT_ID,
        text: renderLeadTelegramMessage(insertRow, leadId),
      });
      if (!tgRes.ok) {
        console.error("leads telegram error:", tgRes.error);
      }
    } catch (tgErr) {
      console.error(
        "leads telegram error:",
        tgErr && tgErr.message ? tgErr.message : tgErr
      );
    }

    return res.status(200).json({ ok: true, lead_id: leadId });
  } catch (err) {
    console.error("leads handler error:", err && err.message ? err.message : err);
    const posthog = getPostHog();
    posthog.captureException(err);
    await posthog.shutdown();
    return res.status(500).json({ ok: false, error: "Could not save your application. Please try again." });
  }
};

module.exports.renderLeadEmail = renderLeadEmail;
