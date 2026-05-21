const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { sendTelegramMessage } = require("./_lib/telegram");
const { PostHog } = require("posthog-node");

const MAX_FIELD_LEN = 4000;
const ADMIN_LEAD_BASE_URL = "https://rabbithole-ops.vercel.app/admin/leads";
const NOTIFICATION_FROM = "Rabbithole <team@mail.rabbithole.consulting>";
const NOTIFICATION_DEFAULT_TO = "goodgameconsultingllc@gmail.com";

function getPostHog() {
  return new PostHog(process.env.POSTHOG_API_KEY, {
    host: process.env.POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
    enableExceptionAutocapture: true,
  });
}

function pickString(body, key) {
  const v = body && body[key];
  if (v == null) return null;
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_FIELD_LEN);
}

function isValidEmail(v) {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length < 320;
}

function splitName(full) {
  if (!full) return { first: null, last: null };
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: null };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function safeSubject(s) {
  return String(s == null ? "" : s).replace(/[\r\n\t]+/g, " ").slice(0, 200);
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeMarkdown(s) {
  if (s == null) return "";
  return String(s).replace(/([_*`\[\]])/g, "\\$1");
}

function parseRecipients(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function renderIclosedTelegram(lead, leadId) {
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ");
  const adminUrl = leadId ? `${ADMIN_LEAD_BASE_URL}/${encodeURIComponent(leadId)}` : null;
  const lines = [];
  lines.push(`📅 *iClosed booking*: ${escapeMarkdown(lead.biz_name || "(unnamed)")}`);
  if (lead.scheduled_at) lines.push(`🗓️ ${escapeMarkdown(lead.scheduled_at)}`);
  lines.push("");
  lines.push(`👤 ${escapeMarkdown(fullName || "(no name)")}`);
  const contact = [
    lead.email ? `✉️ ${lead.email}` : null,
    lead.phone ? `📞 ${lead.phone}` : null,
  ].filter(Boolean).join(" · ");
  if (contact) lines.push(escapeMarkdown(contact));
  if (lead.bottleneck) {
    lines.push("");
    lines.push("*Bottleneck*");
    lines.push(escapeMarkdown(lead.bottleneck.slice(0, 600)));
  }
  if (lead.iclosed_booking_url) {
    lines.push("");
    lines.push(`[Open in iClosed →](${lead.iclosed_booking_url})`);
  }
  if (adminUrl) {
    lines.push(`[Open in admin →](${adminUrl})`);
  }
  return lines.join("\n");
}

function renderIclosedEmail(lead, leadId) {
  const adminUrl = leadId ? `${ADMIN_LEAD_BASE_URL}/${encodeURIComponent(leadId)}` : null;
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ");
  const subject = safeSubject(`📅 iClosed booking: ${lead.biz_name || "(unnamed)"}`);
  const row = (label, value) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#666;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>` +
    `<td style="padding:6px 0;color:#111;word-break:break-word">${value == null || value === "" ? "<span style='color:#aaa'>—</span>" : escapeHtml(value)}</td></tr>`;

  const html = `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;background:#f6f6f6;margin:0;padding:24px">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;padding:28px 32px;border:1px solid #eee">
<h2 style="margin:0 0 4px;font-size:20px">iClosed booking</h2>
<p style="margin:0 0 20px;color:#666;font-size:14px">${escapeHtml(lead.biz_name || "(unnamed business)")}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
${row("Scheduled", lead.scheduled_at)}
${row("Name", fullName)}
${row("Email", lead.email)}
${row("Phone", lead.phone)}
${row("Business", lead.biz_name)}
${row("Bottleneck", lead.bottleneck)}
</table>
${lead.iclosed_booking_url ? `<p style="margin:20px 0 0"><a href="${escapeHtml(lead.iclosed_booking_url)}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">Open in iClosed →</a></p>` : ""}
${adminUrl ? `<p style="margin:12px 0 0"><a href="${escapeHtml(adminUrl)}" style="color:#1d3a8a">Open in Rabbithole Ops →</a></p>` : ""}
</div></body></html>`;

  const text = [
    `iClosed booking: ${lead.biz_name || "(unnamed)"}`,
    `Scheduled: ${lead.scheduled_at || "—"}`,
    `Name:      ${fullName || "—"}`,
    `Email:     ${lead.email || "—"}`,
    `Phone:     ${lead.phone || "—"}`,
    `Bottleneck: ${lead.bottleneck || "—"}`,
    lead.iclosed_booking_url ? `iClosed:   ${lead.iclosed_booking_url}` : null,
    adminUrl ? `Admin:     ${adminUrl}` : null,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}

async function notifyEmail(lead, leadId) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("iclosed-webhook: RESEND_API_KEY not set, skipping email");
    return;
  }
  const to = parseRecipients(process.env.NOTIFICATION_TO_EMAILS || NOTIFICATION_DEFAULT_TO);
  if (!to.length) return;
  const { Resend } = require("resend");
  const resend = new Resend(apiKey);
  const { subject, html, text } = renderIclosedEmail(lead, leadId);
  const result = await resend.emails.send({
    from: NOTIFICATION_FROM,
    to,
    subject,
    html,
    text,
    reply_to: lead.email || undefined,
  });
  if (result && result.error) throw new Error(result.error.message || "Resend error");
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const expected = process.env.ICLOSED_WEBHOOK_SECRET;
  if (!expected) {
    console.error("iclosed-webhook: ICLOSED_WEBHOOK_SECRET not set");
    return res.status(500).json({ ok: false, error: "Server is not configured." });
  }
  const provided = req.headers["x-iclosed-secret"];
  if (!constantTimeEqual(expected, typeof provided === "string" ? provided : "")) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};

  const businessName = pickString(body, "business_name") || pickString(body, "biz_name");
  const bottleneck   = pickString(body, "bottleneck");
  const email        = pickString(body, "email");
  const phone        = pickString(body, "phone");
  const industry     = pickString(body, "industry") || pickString(body, "biz_industry");
  const location     = pickString(body, "biz_location") || pickString(body, "location");
  const website      = pickString(body, "biz_website") || pickString(body, "website");
  const role         = pickString(body, "role");
  const scheduledAt  = pickString(body, "scheduled_at");
  const iclosedLeadId = pickString(body, "iclosed_lead_id");
  const iclosedBookingUrl = pickString(body, "iclosed_booking_url");

  let firstName = pickString(body, "first_name");
  let lastName  = pickString(body, "last_name");
  if (!firstName && !lastName) {
    const full = pickString(body, "full_name") || pickString(body, "name");
    const split = splitName(full);
    firstName = split.first;
    lastName  = split.last;
  }

  if (!businessName)  return res.status(400).json({ ok: false, error: "Missing business_name" });
  if (!bottleneck)    return res.status(400).json({ ok: false, error: "Missing bottleneck" });
  if (!email && !phone) return res.status(400).json({ ok: false, error: "Need at least email or phone" });
  if (email && !isValidEmail(email)) return res.status(400).json({ ok: false, error: "Invalid email" });

  const ICLOSED_PLACEHOLDER = "(iClosed lead — qualify on call)";

  const insertRow = {
    biz_name:     businessName,
    biz_industry: industry || ICLOSED_PLACEHOLDER,
    biz_location: location || null,
    biz_website:  website || null,
    team_size:    ICLOSED_PLACEHOLDER,
    revenue:      ICLOSED_PLACEHOLDER,
    bottleneck,
    tried:        null,
    authority:    ICLOSED_PLACEHOLDER,
    timing:       ICLOSED_PLACEHOLDER,
    budget:       ICLOSED_PLACEHOLDER,
    first_name:   firstName || "(unknown)",
    last_name:    lastName  || "(unknown)",
    email:        email ? email.toLowerCase() : `no-email+${Date.now()}@iclosed.placeholder`,
    phone:        phone || null,
    role:         role || ICLOSED_PLACEHOLDER,
    source_url:   iclosedBookingUrl || "iclosed-webhook",
    user_agent:   typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"].slice(0, MAX_FIELD_LEN) : null,
    ip_hash:      null,
  };

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("iclosed-webhook: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return res.status(500).json({ ok: false, error: "Server is not configured." });
  }

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
      console.error("iclosed-webhook insert error:", error.message);
      return res.status(500).json({ ok: false, error: "Could not save lead." });
    }

    const leadId = data?.id ?? null;
    const enriched = { ...insertRow, scheduled_at: scheduledAt, iclosed_booking_url: iclosedBookingUrl, iclosed_lead_id: iclosedLeadId };

    const posthog = getPostHog();
    try {
      posthog.identify({
        distinctId: insertRow.email,
        properties: {
          $set: {
            email: insertRow.email,
            name: [insertRow.first_name, insertRow.last_name].filter(Boolean).join(" ") || undefined,
            phone: insertRow.phone || undefined,
          },
        },
      });
      await posthog.captureImmediate({
        distinctId: insertRow.email,
        event: "iclosed booking",
        properties: {
          lead_id: leadId,
          biz_name: insertRow.biz_name,
          scheduled_at: scheduledAt,
          iclosed_lead_id: iclosedLeadId,
          source: "iclosed",
        },
      });
    } catch (phErr) {
      console.error("iclosed-webhook posthog error:", phErr && phErr.message ? phErr.message : phErr);
    } finally {
      await posthog.shutdown();
    }

    try { await notifyEmail(enriched, leadId); }
    catch (e) { console.error("iclosed-webhook email error:", e && e.message ? e.message : e); }

    try {
      await sendTelegramMessage({
        token: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_LEADS_CHAT_ID,
        text: renderIclosedTelegram(enriched, leadId),
      });
    } catch (e) {
      console.error("iclosed-webhook telegram error:", e && e.message ? e.message : e);
    }

    return res.status(200).json({ ok: true, lead_id: leadId });
  } catch (err) {
    console.error("iclosed-webhook handler error:", err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, error: "Could not save lead." });
  }
};
