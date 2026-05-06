const ADMIN_LEAD_BASE_URL = "https://rabbithole-ops.vercel.app/admin/leads";
const BOTTLENECK_PREVIEW_MAX = 200;
const TELEGRAM_MESSAGE_MAX = 4096;

function escapeMarkdown(s) {
  if (s == null) return "";
  return String(s).replace(/([_*`\[\]])/g, "\\$1");
}

function previewBottleneck(s) {
  if (s == null) return "";
  const collapsed = String(s).replace(/\s+/g, " ").trim();
  if (collapsed.length <= BOTTLENECK_PREVIEW_MAX) return collapsed;
  return collapsed.slice(0, BOTTLENECK_PREVIEW_MAX - 1).trimEnd() + "…";
}

function joinMeta(parts) {
  return parts
    .map((p) => (p == null ? "" : String(p).trim()))
    .filter(Boolean)
    .join(" · ");
}

function renderLeadTelegramMessage(lead, leadId) {
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ");
  const meta = joinMeta([lead.biz_location, lead.biz_industry]);
  const adminUrl = leadId ? `${ADMIN_LEAD_BASE_URL}/${encodeURIComponent(leadId)}` : null;
  const bottleneck = previewBottleneck(lead.bottleneck);

  const lines = [];
  lines.push(`🟢 *New Rabbithole lead*: ${escapeMarkdown(lead.biz_name || "(unnamed)")}`);
  if (meta) lines.push(`📍 ${escapeMarkdown(meta)}`);
  if (lead.biz_website) lines.push(`🌐 ${escapeMarkdown(lead.biz_website)}`);
  lines.push("");
  lines.push(
    `👤 ${escapeMarkdown(fullName || "(no name)")}${lead.role ? ` (${escapeMarkdown(lead.role)})` : ""}`
  );
  const contact = joinMeta([
    lead.email ? `✉️ ${lead.email}` : null,
    lead.phone ? `📞 ${lead.phone}` : null,
  ]);
  if (contact) lines.push(escapeMarkdown(contact));
  lines.push("");
  lines.push("*Qualifiers*");
  lines.push(`• Authority: ${escapeMarkdown(lead.authority || "—")}`);
  lines.push(`• Timing: ${escapeMarkdown(lead.timing || "—")}`);
  lines.push(`• Budget: ${escapeMarkdown(lead.budget || "—")}`);
  lines.push(
    `• Team: ${escapeMarkdown(lead.team_size || "—")} · Revenue: ${escapeMarkdown(
      lead.revenue || "—"
    )}`
  );
  if (bottleneck) {
    lines.push("");
    lines.push("*Bottleneck*");
    lines.push(escapeMarkdown(bottleneck));
  }
  if (adminUrl) {
    lines.push("");
    lines.push(`[Open in admin →](${adminUrl})`);
  }

  const text = lines.join("\n");
  return text.length > TELEGRAM_MESSAGE_MAX
    ? text.slice(0, TELEGRAM_MESSAGE_MAX - 1) + "…"
    : text;
}

async function sendTelegramMessage({ token, chatId, text, parseMode = "Markdown" }) {
  if (!token || !chatId) return { ok: false, error: "no creds" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: false,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!json || !json.ok) {
      return { ok: false, error: (json && json.description) || `http ${res.status}` };
    }
    return { ok: true, message_id: json.result && json.result.message_id };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

module.exports = {
  sendTelegramMessage,
  renderLeadTelegramMessage,
};
