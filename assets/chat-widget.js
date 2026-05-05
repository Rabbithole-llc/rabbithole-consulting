/* Ask Rabbithole — chat widget
 * Self-contained. Mounts a floating launcher and chat panel,
 * streams responses from /api/chat (Claude Sonnet 4.6 backend).
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'rh_chat_history_v1';
  const MAX_HISTORY = 30; // keep last N messages in localStorage
  const ENDPOINT = '/api/chat';

  const SUGGESTIONS = [
    'What does Rabbithole actually do?',
    'How long does the build take?',
    'How does pricing work?',
    'What kinds of businesses do you work with?',
  ];

  const WELCOME = "Hey. We're the chat for Rabbithole. Ask us how we'd build infrastructure for your business, what we charge, how fast we move, or anything else. If we hit something that needs a real call, we'll point you at our application.";

  // ---------- DOM scaffolding ----------
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.startsWith('on') && typeof attrs[k] === 'function') node.addEventListener(k.slice(2), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      }
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(c => {
        if (c == null) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  // Inline SVG icons
  const ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const ICON_SEND = '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 5l7 7-7 7"/></svg>';
  const ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';

  // ---------- State ----------
  let messages = [];
  let isOpen = false;
  let isStreaming = false;
  let panelEl, launcherEl, messagesEl, inputEl, sendBtnEl, suggestionsEl;

  // ---------- Persistence ----------
  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
    return [];
  }
  function saveHistory() {
    try {
      const trimmed = messages.slice(-MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {}
  }

  // ---------- Markdown-lite for bot messages ----------
  // Handles **bold**, *italic*, line breaks, and bare links (https://...).
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }
  function renderText(s) {
    let out = escapeHtml(s);
    // Bold **text**
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic *text* (but not **)
    out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    // Bare links
    out = out.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    // Relative path links (e.g. /apply or rabbithole.consulting/apply)
    out = out.replace(/(^|\s)(rabbithole\.consulting\/[a-z\-\/]+)/gi, '$1<a href="https://$2" target="_blank" rel="noopener">$2</a>');
    out = out.replace(/(^|\s)(\/apply)\b/g, '$1<a href="/apply.html">$2</a>');
    return out;
  }

  // ---------- Render ----------
  function renderMessage(role, content, opts) {
    opts = opts || {};
    const cls = role === 'user' ? 'rh-msg rh-user' : 'rh-msg rh-bot';
    const node = el('div', { class: cls });
    if (role === 'assistant') {
      node.innerHTML = renderText(content);
    } else {
      node.textContent = content;
    }
    if (opts.id) node.id = opts.id;
    return node;
  }
  function appendMessage(role, content, opts) {
    const node = renderMessage(role, content, opts);
    messagesEl.appendChild(node);
    scrollToBottom();
    return node;
  }
  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }
  function showTyping() {
    const t = el('div', { class: 'rh-typing', id: 'rh-typing' }, [
      el('span'), el('span'), el('span'),
    ]);
    messagesEl.appendChild(t);
    scrollToBottom();
  }
  function hideTyping() {
    const t = document.getElementById('rh-typing');
    if (t) t.remove();
  }
  function renderSuggestions() {
    if (!suggestionsEl) return;
    suggestionsEl.innerHTML = '';
    if (messages.length > 0) return; // only show on empty history
    SUGGESTIONS.forEach(text => {
      const b = el('button', { class: 'rh-suggestion', type: 'button', onclick: () => {
        send(text);
      }}, text);
      suggestionsEl.appendChild(b);
    });
  }

  // ---------- Streaming ----------
  async function streamReply() {
    showTyping();
    let aborted = false;
    let assistantNode = null;
    let accumulated = '';

    try {
      const resp = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });

      if (!resp.ok) {
        hideTyping();
        const errText = await resp.text().catch(() => '');
        appendMessage('assistant', "Something on our end hiccuped. Try again, or apply at /apply if you'd rather skip the chat.");
        return;
      }
      if (!resp.body) {
        hideTyping();
        appendMessage('assistant', 'No response stream. Try again.');
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events. Each event ends with \n\n.
        const events = buffer.split('\n\n');
        buffer = events.pop(); // last chunk may be incomplete

        for (const ev of events) {
          if (!ev.trim()) continue;
          const lines = ev.split('\n');
          let dataStr = '';
          for (const line of lines) {
            if (line.startsWith('data:')) {
              dataStr += line.slice(5).trim();
            }
          }
          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);
            if (data.type === 'content_block_delta' && data.delta && data.delta.type === 'text_delta') {
              const chunk = data.delta.text || '';
              if (chunk) {
                if (!assistantNode) {
                  hideTyping();
                  assistantNode = appendMessage('assistant', '');
                }
                accumulated += chunk;
                assistantNode.innerHTML = renderText(accumulated);
                scrollToBottom();
              }
            } else if (data.type === 'message_stop') {
              // done
            } else if (data.type === 'error') {
              hideTyping();
              if (!assistantNode) {
                appendMessage('assistant', "We hit a snag connecting upstream. Try again in a moment.");
              }
            }
          } catch (e) {
            // ignore malformed event
          }
        }
      }

      if (!assistantNode) {
        hideTyping();
        appendMessage('assistant', "We didn't get a response. Try again.");
        return;
      }

      // Save to history
      messages.push({ role: 'assistant', content: accumulated });
      saveHistory();
    } catch (err) {
      hideTyping();
      if (!assistantNode) {
        appendMessage('assistant', "Connection trouble on our end. Try again, or apply directly at /apply.");
      }
    } finally {
      isStreaming = false;
      updateSendButton();
    }
  }

  // ---------- Send ----------
  function send(text) {
    text = (text || '').trim();
    if (!text || isStreaming) return;

    messages.push({ role: 'user', content: text });
    saveHistory();
    appendMessage('user', text);

    // Hide suggestions once a real message is sent
    if (suggestionsEl) suggestionsEl.innerHTML = '';

    inputEl.value = '';
    autosizeInput();

    isStreaming = true;
    updateSendButton();
    streamReply();
  }
  function updateSendButton() {
    if (!sendBtnEl) return;
    sendBtnEl.disabled = isStreaming || inputEl.value.trim().length === 0;
  }
  function autosizeInput() {
    if (!inputEl) return;
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  }

  // ---------- Open / close ----------
  function open() {
    isOpen = true;
    panelEl.classList.add('rh-open');
    launcherEl.classList.add('rh-hidden');
    setTimeout(() => inputEl && inputEl.focus(), 250);
  }
  function close() {
    isOpen = false;
    panelEl.classList.remove('rh-open');
    launcherEl.classList.remove('rh-hidden');
  }

  // ---------- Mount ----------
  function mount() {
    // Launcher (icon-only circle)
    launcherEl = el('button', {
      class: 'rh-chat-launcher',
      type: 'button',
      'aria-label': 'Open chat with Rabbithole',
      html: ICON_CHAT,
    });
    launcherEl.addEventListener('click', open);

    // Panel
    suggestionsEl = el('div', { class: 'rh-suggestions' });
    messagesEl = el('div', { class: 'rh-chat-messages' });
    inputEl = el('textarea', {
      class: 'rh-chat-input',
      rows: '1',
      placeholder: 'Ask anything about Rabbithole.',
      'aria-label': 'Message',
    });
    inputEl.addEventListener('input', () => { autosizeInput(); updateSendButton(); });
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send(inputEl.value);
      }
    });

    sendBtnEl = el('button', {
      class: 'rh-chat-send',
      type: 'button',
      'aria-label': 'Send',
      html: ICON_SEND,
    });
    sendBtnEl.addEventListener('click', () => send(inputEl.value));

    const closeBtn = el('button', {
      class: 'rh-chat-close',
      type: 'button',
      'aria-label': 'Close chat',
      html: ICON_CLOSE,
    });
    closeBtn.addEventListener('click', close);

    panelEl = el('div', { class: 'rh-chat-panel', role: 'dialog', 'aria-label': 'Chat with Rabbithole' }, [
      el('header', { class: 'rh-chat-header' }, [
        el('div', { class: 'rh-chat-title' }, [
          el('div', { class: 'rh-chat-mark-sm', 'aria-hidden': 'true' }),
          el('div', { class: 'rh-chat-title-stack' }, [
            el('div', { class: 'rh-chat-title-name' }, 'Ask Rabbithole'),
            el('div', { class: 'rh-chat-title-status' }, 'Online'),
          ]),
        ]),
        closeBtn,
      ]),
      messagesEl,
      el('div', { class: 'rh-chat-input-wrap' }, [
        suggestionsEl,
        el('div', { class: 'rh-chat-input-row' }, [
          inputEl,
          sendBtnEl,
        ]),
        el('div', { class: 'rh-chat-foot' }, 'Press Enter to send. Shift+Enter for a new line.'),
      ]),
    ]);

    document.body.appendChild(launcherEl);
    document.body.appendChild(panelEl);

    // Hydrate history
    messages = loadHistory();
    if (messages.length === 0) {
      appendMessage('assistant', WELCOME);
    } else {
      messages.forEach(m => appendMessage(m.role, m.content));
    }
    renderSuggestions();
    updateSendButton();
  }

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
