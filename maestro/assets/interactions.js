// Maestro demo: shared interaction layer.
// Global handlers for [data-action] clicks, toast notifications,
// modals, and the "simulate agent" loader.

(function () {

  // ----- TOAST -----
  function ensureToastContainer() {
    let el = document.getElementById('maestro-toasts');
    if (!el) {
      el = document.createElement('div');
      el.id = 'maestro-toasts';
      el.className = 'toast-container';
      document.body.appendChild(el);
    }
    return el;
  }

  function showToast(message, opts = {}) {
    const c = ensureToastContainer();
    const t = document.createElement('div');
    t.className = `toast toast-${opts.kind || 'info'}`;
    t.innerHTML = `
      <div class="toast-icon">${iconFor(opts.kind || 'info')}</div>
      <div class="toast-body">
        ${opts.title ? `<div class="toast-title">${opts.title}</div>` : ''}
        <div class="toast-msg">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;
    c.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast-show'));
    const dismiss = () => {
      t.classList.remove('toast-show');
      setTimeout(() => t.remove(), 200);
    };
    t.querySelector('.toast-close').addEventListener('click', dismiss);
    setTimeout(dismiss, opts.duration || 3200);
    return dismiss;
  }

  function iconFor(kind) {
    const map = {
      success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6L9 17l-5-5"/></svg>',
      info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>',
      warn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
      danger: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
      agent: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/></svg>',
    };
    return map[kind] || map.info;
  }

  // ----- MODAL -----
  function showModal({ title, body, primary, secondary, kind = 'info' }) {
    return new Promise(resolve => {
      const back = document.createElement('div');
      back.className = 'modal-backdrop';
      back.innerHTML = `
        <div class="modal">
          ${title ? `<div class="modal-title">${title}</div>` : ''}
          <div class="modal-body">${body || ''}</div>
          <div class="modal-actions">
            ${secondary ? `<button class="btn btn-secondary" data-resolve="${secondary.value || 'cancel'}">${secondary.label || 'Cancel'}</button>` : ''}
            ${primary ? `<button class="btn btn-primary" data-resolve="${primary.value || 'ok'}">${primary.label || 'OK'}</button>` : ''}
          </div>
        </div>
      `;
      document.body.appendChild(back);
      requestAnimationFrame(() => back.classList.add('modal-show'));

      const close = (val) => {
        back.classList.remove('modal-show');
        setTimeout(() => back.remove(), 180);
        resolve(val);
      };
      back.addEventListener('click', (e) => { if (e.target === back) close('cancel'); });
      back.querySelectorAll('[data-resolve]').forEach(btn => {
        btn.addEventListener('click', () => close(btn.dataset.resolve));
      });
      document.addEventListener('keydown', function onEsc(e) {
        if (e.key === 'Escape') { close('cancel'); document.removeEventListener('keydown', onEsc); }
      });
    });
  }

  // ----- SIMULATED AGENT -----
  // Shows an inline "agent thinking" indicator, runs callback after delay.
  function simulateAgent({ label = 'Working...', durationMs = 1800, onDone, toast = true }) {
    if (toast) {
      const dismiss = showToast(label, { kind: 'agent', duration: durationMs + 400, title: 'Maestro' });
    }
    setTimeout(() => {
      try { onDone && onDone(); } catch (e) { console.error(e); }
    }, durationMs);
  }

  // ----- GLOBAL CLICK DISPATCH -----
  const ACTIONS = {
    'reset-demo': () => {
      MaestroState.reset();
      showToast('Demo reset to initial state', { kind: 'success' });
      setTimeout(() => location.reload(), 600);
    },
    'navigate': (el) => {
      const href = el.dataset.href;
      if (href) location.href = href;
    },
    'toast': (el) => {
      showToast(el.dataset.message || 'Done', { kind: el.dataset.kind || 'info' });
    },
    'simulate-agent': (el) => {
      simulateAgent({ label: el.dataset.label || 'Agent working...', durationMs: parseInt(el.dataset.duration || '1800') });
    },
    'modal': async (el) => {
      const id = el.dataset.modalId;
      const reg = window.MaestroModals || {};
      const def = reg[id];
      if (def) await showModal(def);
      else showToast('Modal: ' + id);
    },
  };

  function dispatch(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const fn = ACTIONS[el.dataset.action];
    if (fn) {
      e.preventDefault();
      e.stopPropagation();
      fn(el, e);
    }
    // Else: page-specific scripts will handle their own data-action values.
  }

  // ----- PAGE-LEVEL ACTION REGISTRY -----
  // Pages can register additional handlers via window.MaestroActions.
  window.MaestroActions = {
    register(name, fn) { ACTIONS[name] = fn; },
    dispatch,
    showToast,
    showModal,
    simulateAgent,
  };

  // ----- MUTABLE INPUTS / CHECKBOXES / TABS via [data-toggle] -----
  // Generic toggler: clicking an element with [data-toggle="<class>"] toggles that class on itself.
  function toggleHandler(e) {
    const el = e.target.closest('[data-toggle]');
    if (!el) return;
    el.classList.toggle(el.dataset.toggle);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', dispatch, true);
    document.addEventListener('click', toggleHandler);

    // Add reset button to topbar for demo convenience (kept subtle).
    const tb = document.querySelector('.topbar-actions');
    if (tb && !document.getElementById('reset-demo-btn')) {
      const reset = document.createElement('button');
      reset.id = 'reset-demo-btn';
      reset.className = 'btn btn-ghost';
      reset.title = 'Reset demo state';
      reset.dataset.action = 'reset-demo';
      reset.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M3.51 15a9 9 0 0014.85 3.36L23 14"/></svg>';
      tb.insertBefore(reset, tb.firstChild);
    }
  });

  // Expose toast/modal for direct script use.
  window.maestroToast = showToast;
  window.maestroModal = showModal;
  window.maestroAgent = simulateAgent;
})();
