// Lightweight intake from the /hello Virtual Sales Agent.
// Required Supabase migration (run once in the SQL Editor) — see WIRING.md.
// If the table doesn't exist yet, we still notify via Resend + Telegram and return ok:true.

const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { sendTelegramMessage } = require("./_lib/telegram");
const { PostHog } = require("posthog-node");

const ALLOWED_ORIGINS = new Set([
  "https://www.rabbithole.consulting",
  "https://rabbithole.consulting",
]);

const MAX_FIELD_LEN = 4000;
const MAX_TRANSCRIPT_TURNS = 50;
const MAX_TRANSCRIPT_TEXT = 1500;

function getPostHog() {
  return new PostHog(process.env.POSTHOG_API_KEY, {
    host: process.env.POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
}

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

function pickString(body, key) {
  const v = body[key];
  if (v == null || typeof v !== "string") return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_FIELD_LEN);
}

function isValidEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length < 320;
}

function normalizePhone(value) {
  if (typeof value !== "string") return null;
  const digits = value.replace(/[^\d+]/g, "");
  if (digits.replace(/\+/g, "").length < 7) return null;
  return digits.slice(0, 32);
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

function sanitizeTranscript(raw) {
  if (!Array.isArray(raw)) return null;
  const cleaned = [];
  for (const turn of raw.slice(-MAX_TRANSCRIPT_TURNS)) {
    if (!turn || typeof turn !== "object") continue;
    const role = turn.role === "user" ? "user" : turn.role === "agent" ? "agent" : null;
    if (!role) continue;
    const content = typeof turn.content === "string"
      ? turn.content.slice(0, MAX_TRANSCRIPT_TEXT)
      : null;
    if (!content) continue;
    cleaned.push({ role, content });
  }
  return cleaned.length ? cleaned : null;
}

// ---------- Notifications ----------
const NOTIFICATION_FROM = "Rabbithole <team@mail.rabbithole.consulting>";
const NOTIFICATION_DEFAULT_TO = "goodgameconsultingllc@gmail.com";

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseRecipients(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function renderSalesAgentEmail(lead) {
  const subject = `🐰 New Sales Agent lead: ${lead.first_name || "(no name)"} (${lead.industry || "—"})`;

  const row = (label, value) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#666;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>` +
    `<td style="padding:6px 0;color:#111;word-break:break-word">${value == null || value === "" ? "<span style='color:#aaa'>—</span>" : escapeHtml(value)}</td></tr>`;

  let transcriptHtml = "";
  let transcriptText = "";
  if (lead.transcript && Array.isArray(lead.transcript) && lead.transcript.length) {
    transcriptHtml = `
  <h3 style="margin:24px 0 8px;font-size:14px;text-transform:uppercase;color:#888;letter-spacing:.04em">Conversation</h3>
  <div style="background:#fafafa;border:1px solid #eee;border-radius:6px;padding:12px 14px;font-size:13px;line-height:1.55">
    ${lead.transcript.map(t => `<div style="margin:0 0 6px"><strong style="color:${t.role === "agent" ? "#1d3a8a" : "#0a0a0a"}">${t.role === "agent" ? "Agent" : "Visitor"}:</strong> ${escapeHtml(t.content)}</div>`).join("")}
  </div>`;
    transcriptText = "\n\nCONVERSATION\n" + lead.transcript.map(t =>
      `${t.role === "agent" ? "Agent" : "Visitor"}: ${t.content}`
    ).join("\n");
  }

  const html = `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;background:#f6f6f6;margin:0;padding:24px">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;padding:28px 32px;border:1px solid #eee">
  <h2 style="margin:0 0 4px;font-size:20px">New Virtual Sales Agent lead</h2>
  <p style="margin:0 0 20px;color:#666;font-size:14px">${escapeHtml(lead.first_name || "(no name)")} · ${escapeHtml(lead.industry || "—")}</p>

  <h3 style="margin:18px 0 8px;font-size:14px;text-transform:uppercase;color:#888;letter-spacing:.04em">Contact</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    ${row("First name", lead.first_name)}
    ${row("Email", lead.email)}
    ${row("Phone", lead.phone)}
    ${row("Preferred channel", lead.contact_method)}
  </table>

  <h3 style="margin:24px 0 8px;font-size:14px;text-transform:uppercase;color:#888;letter-spacing:.04em">Context</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    ${row("Entry intent", lead.entry_intent)}
    ${row("Industry", lead.industry)}
    ${row("Bottleneck", lead.problem)}
    ${row("Their description", lead.biz_description)}
    ${row("Asked for", lead.action_chosen)}
  </table>
  ${transcriptHtml}
  ${lead.source_url ? `<p style="margin:18px 0 0;font-size:12px;color:#999">Source: ${escapeHtml(lead.source_url)}</p>` : ""}
</div></body></html>`;

  const lines = [
    `New Virtual Sales Agent lead: ${lead.first_name || "(no name)"} (${lead.industry || "—"})`,
    "",
    "CONTACT",
    `  First name: ${lead.first_name || "—"}`,
    `  Email:      ${lead.email || "—"}`,
    `  Phone:      ${lead.phone || "—"}`,
    `  Channel:    ${lead.contact_method || "—"}`,
    "",
    "CONTEXT",
    `  Industry:   ${lead.industry || "—"}`,
    `  Bottleneck: ${lead.problem || "—"}`,
    `  Asked for:  ${lead.action_chosen || "—"}`,
  ];
  const text = lines.join("\n") + transcriptText + (lead.source_url ? `\n\nSource: ${lead.source_url}` : "");

  return { subject, html, text };
}

async function notifyNewLead(lead) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("sales-agent-lead notify: RESEND_API_KEY not set, skipping email");
    return;
  }
  const to = parseRecipients(process.env.NOTIFICATION_TO_EMAILS || NOTIFICATION_DEFAULT_TO);
  if (!to.length) return;
  const { Resend } = require("resend");
  const resend = new Resend(apiKey);
  const { subject, html, text } = renderSalesAgentEmail(lead);
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

function renderTelegramMessage(lead) {
  function esc(s) {
    if (s == null) return "—";
    return String(s).replace(/([_*`\[\]])/g, "\\$1");
  }
  const lines = [];
  lines.push(`🐰 *New Sales Agent lead*: ${esc(lead.first_name || "(no name)")}`);
  lines.push(`🚪 Entry: *${esc(lead.entry_intent || "—")}*`);
  lines.push(`🏷️ ${esc(lead.industry || "—")} · ${esc(lead.problem || "—")}`);
  lines.push("");
  if (lead.email) lines.push(`✉️ ${esc(lead.email)}`);
  if (lead.phone) lines.push(`📞 ${esc(lead.phone)}`);
  lines.push(`🎯 Asked for: *${esc(lead.action_chosen || "—")}*`);
  if (lead.biz_description) {
    lines.push("");
    lines.push("*Their description*");
    lines.push(esc(lead.biz_description.slice(0, 500)));
  }
  if (lead.source_url) lines.push(`🔗 ${esc(lead.source_url)}`);
  return lines.join("\n").slice(0, 3900);
}

// ---------- Handler ----------
module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const body = req.body && typeof req.body === "object" ? req.body : {};

  const lead = {
    entry_intent: pickString(body, "entry_intent"),
    industry: pickString(body, "industry"),
    problem: pickString(body, "problem"),
    biz_description: pickString(body, "biz_description"),
    action_chosen: pickString(body, "action_chosen"),
    first_name: pickString(body, "first_name"),
    contact_method: pickString(body, "contact_method"),
    email: pickString(body, "email"),
    phone: normalizePhone(pickString(body, "phone")),
    transcript: sanitizeTranscript(body.transcript),
  };

  // At minimum we need a first name + (email or phone)
  if (!lead.first_name) {
    return res.status(400).json({ ok: false, error: "Missing first name." });
  }
  if (!lead.email && !lead.phone) {
    return res.status(400).json({ ok: false, error: "Email or phone required." });
  }
  if (lead.email) {
    if (!isValidEmail(lead.email)) {
      return res.status(400).json({ ok: false, error: "Please enter a valid email." });
    }
    lead.email = lead.email.toLowerCase();
  }

  const enriched = {
    ...lead,
    source_url: sourceUrlFrom(req),
    user_agent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"].slice(0, MAX_FIELD_LEN) : null,
    ip_hash: hashIp(req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress)),
  };

  // ----- Supabase (graceful fallback) -----
  let leadId = null;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await supabase
        .from("sales_agent_leads")
        .insert(enriched)
        .select("id")
        .single();
      if (error) {
        console.error("sales-agent-lead supabase insert error:", error.message);
      } else {
        leadId = data && data.id ? data.id : null;
      }
    } catch (e) {
      console.error("sales-agent-lead supabase exception:", e && e.message ? e.message : e);
    }
  } else {
    console.warn("sales-agent-lead: Supabase env not configured, skipping DB insert");
  }

  // ----- Email -----
  try {
    await notifyNewLead(enriched);
  } catch (e) {
    console.error("sales-agent-lead email error:", e && e.message ? e.message : e);
  }

  // ----- Telegram -----
  try {
    const tg = await sendTelegramMessage({
      token: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_LEADS_CHAT_ID,
      text: renderTelegramMessage(enriched),
    });
    if (!tg.ok) {
      console.error("sales-agent-lead telegram error:", tg.error);
    }
  } catch (e) {
    console.error("sales-agent-lead telegram exception:", e && e.message ? e.message : e);
  }

  // ----- PostHog -----
  try {
    if (process.env.POSTHOG_API_KEY) {
      const posthog = getPostHog();
      if (enriched.email) {
        posthog.identify({
          distinctId: enriched.email,
          properties: {
            $set: {
              email: enriched.email,
              first_name: enriched.first_name,
              phone: enriched.phone,
              lead_source: "virtual_sales_agent",
            },
          },
        });
      }
      await posthog.captureImmediate({
        distinctId: enriched.email || enriched.phone || "anon",
        event: "sales_agent_lead_submitted",
        properties: {
          lead_id: leadId,
          industry: enriched.industry,
          problem: enriched.problem,
          action_chosen: enriched.action_chosen,
          contact_method: enriched.contact_method,
          source_url: enriched.source_url,
        },
      });
      await posthog.shutdown();
    }
  } catch (e) {
    console.error("sales-agent-lead posthog error:", e && e.message ? e.message : e);
  }

  return res.status(200).json({ ok: true, lead_id: leadId });
};

module.exports.renderSalesAgentEmail = renderSalesAgentEmail;
