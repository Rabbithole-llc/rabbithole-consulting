// Maestro demo: shared layout injection
// Each page sets a data-page="<key>" on <body>; this script injects sidebar+topbar.

// ----- Gate check -----
// Every demo page checks the unlock flag. If missing, send them to the gate.
// This protects against deep-link bypass (e.g., /maestro/dashboard.html).
// Note: we check for ANY truthy value so that future password/version bumps
// in the gate's AUTH_VALUE don't accidentally cause a redirect loop.
(function gateCheck() {
  try {
    const flag = localStorage.getItem('maestroAuth');
    if (!flag || !flag.startsWith('unlocked')) {
      // Avoid an infinite loop if we're already on the gate page.
      const p = window.location.pathname;
      const isGate = /\/maestro\/?$/.test(p) || /\/maestro\/index(\.html)?$/.test(p);
      if (!isGate) {
        window.location.replace('index.html');
      }
    }
  } catch (e) { /* localStorage disabled — just let them through */ }
})();

// ----- Block search indexing on every demo page -----
(function injectNoindex() {
  if (!document.querySelector('meta[name="robots"]')) {
    const m = document.createElement('meta');
    m.name = 'robots';
    m.content = 'noindex, nofollow';
    (document.head || document.documentElement).appendChild(m);
  }
})();

// ----- Favicon on every demo page (Rabbithole mark) -----
(function injectFavicon() {
  if (!document.querySelector('link[rel="icon"]')) {
    const ico = document.createElement('link');
    ico.rel = 'icon';
    ico.type = 'image/png';
    ico.href = 'assets/icons/rabbithole-logo-white-tight.png';
    (document.head || document.documentElement).appendChild(ico);
  }
  if (!document.querySelector('link[rel="apple-touch-icon"]')) {
    const apple = document.createElement('link');
    apple.rel = 'apple-touch-icon';
    apple.href = 'assets/icons/rabbithole-logo-white-tight.png';
    (document.head || document.documentElement).appendChild(apple);
  }
})();

(function () {
  const NAV_GROUPS = [
    {
      label: 'Plan',
      items: [
        { key: 'dashboard', label: 'Dashboard', href: 'dashboard.html', icon: 'grid' },
        { key: 'brand', label: 'Brand Context', href: 'brand.html', icon: 'sparkle' },
        { key: 'calendar', label: 'Content Calendar', href: 'calendar.html', icon: 'calendar' },
      ],
    },
    {
      label: 'Create',
      items: [
        { key: 'creative', label: 'Creative Studio', href: 'creative.html', icon: 'image' },
        { key: 'library', label: 'Media Library', href: 'library.html', icon: 'folder' },
        { key: 'copy', label: 'Copy Editor', href: 'copy.html', icon: 'pen' },
      ],
    },
    {
      label: 'Distribute',
      items: [
        { key: 'schedule', label: 'Publishing Queue', href: 'schedule.html', icon: 'send' },
        { key: 'ads', label: 'Paid Ads', href: 'ads.html', icon: 'target' },
      ],
    },
    {
      label: 'Measure',
      items: [
        { key: 'analytics', label: 'Analytics', href: 'analytics.html', icon: 'chart' },
        { key: 'health', label: 'Health', href: 'health.html', icon: 'pulse' },
      ],
    },
  ];

  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    sparkle: '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M19 14l.7 1.8L21.5 16.5 19.7 17.2 19 19l-.7-1.8L16.5 16.5 18.3 15.8z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4z"/>',
    send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/>',
    folder: '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>',
    pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  };

  function svgIcon(name) {
    return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  }

  function buildSidebar(activeKey) {
    const groups = NAV_GROUPS.map((g) => `
      <div class="nav-group-label">${g.label}</div>
      ${g.items.map((it) => `
        <a class="nav-item ${it.key === activeKey ? 'active' : ''}" href="${it.href}">
          ${svgIcon(it.icon)}
          <span>${it.label}</span>
        </a>
      `).join('')}
    `).join('');

    return `
      <aside class="sidebar">
        <a href="dashboard.html" style="text-decoration:none; color:inherit;">
          <div class="sidebar-brand">
            <div class="sidebar-brand-mark"><img src="assets/icons/rabbithole-logo-white-tight.png?v=2" alt="Rabbithole"></div>
            <div>
              <div class="sidebar-brand-text">Maestro</div>
              <div class="sidebar-brand-sub">by Rabbithole</div>
            </div>
          </div>
        </a>
        ${groups}
        <div class="divider"></div>
        <a class="nav-item" href="#" id="maestro-settings-link" style="font-size:12px;">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          <span>Settings</span>
        </a>
      </aside>
    `;
  }

  function buildTopbar() {
    return `
      <div class="topbar">
        <div style="display:flex; align-items:center; gap:14px;">
          <div class="tenant-chip" style="padding: 5px 10px 5px 8px; gap: 8px;">
            <img src="assets/photos/magdalena-logo-brown-tight.png?v=1" alt="Magdalena 1163" style="height: 20px; width: auto; display: block;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 9l6 6 6-6"/></svg>
          </div>
          <span style="font-size:12px; color: var(--text-dim);">Boutique Hotel · Condado, San Juan</span>
        </div>
        <div class="topbar-actions">
          <a href="https://rabbithole.consulting" target="_blank" rel="noopener" title="Built by Rabbithole Consulting"
             style="display:flex; align-items:center; gap:6px; font-size:11px; color: var(--text-dim); text-decoration:none; padding:6px 10px; border-radius:6px; transition: background 0.15s, color 0.15s;"
             onmouseover="this.style.background='var(--surface-2)'; this.style.color='var(--text-muted)';"
             onmouseout="this.style.background=''; this.style.color='var(--text-dim)';">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span>Rabbithole</span>
          </a>
          <div style="width:1px; height:20px; background: var(--border);"></div>
          <button class="btn btn-ghost" title="Search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
            <span class="kbd">⌘K</span>
          </button>
          <button class="btn btn-ghost" title="Notifications">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>
          </button>
          <div style="width:1px; height:20px; background: var(--border);"></div>
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="assets/photos/austin-white.jpg" alt="Austin White" style="width:28px; height:28px; border-radius:50%; object-fit:cover; object-position:center;">
            <div style="line-height:1.2;">
              <div style="font-size:13px; font-weight:500;">Austin White</div>
              <div style="font-size:11px; color: var(--text-dim);">Operator</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const activeKey = document.body.dataset.page || '';
    const content = document.querySelector('main.page-content');
    if (!content) return;

    const shell = document.createElement('div');
    shell.className = 'app-shell';
    shell.innerHTML = `
      ${buildSidebar(activeKey)}
      <div>
        ${buildTopbar()}
        ${content.outerHTML}
      </div>
    `;

    document.body.innerHTML = '';
    document.body.appendChild(shell);
    document.body.dataset.page = activeKey;

    // Auto-load page helpers + page controller after layout is in place.
    if (activeKey) {
      const helpers = document.createElement('script');
      helpers.src = 'assets/page-helpers.js';
      helpers.async = false;
      document.body.appendChild(helpers);
      helpers.onload = () => {
        const s = document.createElement('script');
        s.src = `assets/page-${activeKey}.js`;
        s.async = false;
        document.body.appendChild(s);
        s.onload = () => { wireGlobalChrome(); };
      };
    } else {
      wireGlobalChrome();
    }
  });

  // Global chrome wiring: Settings nav + topbar buttons.
  function wireGlobalChrome() {
    const settings = document.getElementById('maestro-settings-link');
    if (settings && !settings.dataset.wired) {
      settings.dataset.wired = '1';
      settings.addEventListener('click', (e) => {
        e.preventDefault();
        openSettingsModal();
      });
    }
  }

  // Clear any lingering dark-mode preference from earlier builds.
  try {
    localStorage.removeItem('maestro-theme');
    document.documentElement.removeAttribute('data-theme');
  } catch (e) {}

  function openSettingsModal() {
    if (typeof maestroModal !== 'function') {
      window.location.href = 'dashboard.html';
      return;
    }
    const body = `
      <div style="display:grid; grid-template-columns: 160px 1fr; gap: 20px; min-height: 360px;">
        <div style="border-right: 1px solid var(--border); padding-right: 16px; font-size: 13px;">
          <div class="set-tab active" data-tab="workspace" style="padding:8px 10px; border-radius:6px; background: var(--accent-soft); color: var(--accent); font-weight:600; cursor:pointer;">Workspace</div>
          <div class="set-tab" data-tab="team" style="padding:8px 10px; border-radius:6px; cursor:pointer; color: var(--text-muted);">Team</div>
          <div class="set-tab" data-tab="channels" style="padding:8px 10px; border-radius:6px; cursor:pointer; color: var(--text-muted);">Connected channels</div>
          <div class="set-tab" data-tab="billing" style="padding:8px 10px; border-radius:6px; cursor:pointer; color: var(--text-muted);">Billing</div>
          <div class="set-tab" data-tab="notifications" style="padding:8px 10px; border-radius:6px; cursor:pointer; color: var(--text-muted);">Notifications</div>
        </div>
        <div id="set-pane">
          <div data-pane="workspace">
            <div style="font-size:14px; font-weight:600; margin-bottom:14px;">Workspace</div>
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
              <img src="assets/photos/magdalena-logo-brown.png?v=2" alt="" style="width:48px; height:48px; object-fit:contain; border:1px solid var(--border); border-radius:8px; padding:6px; background: var(--surface);">
              <div>
                <div style="font-size:13px; font-weight:600;">Magdalena 1163</div>
                <div style="font-size:12px; color: var(--text-dim);">Boutique Hotel · Condado, San Juan, PR</div>
              </div>
            </div>
            <div style="font-size:12px; color: var(--text-dim); margin-bottom:6px;">Workspace timezone</div>
            <div style="font-size:13px; padding: 8px 10px; border: 1px solid var(--border); border-radius:6px; margin-bottom:14px;">America/Puerto_Rico (AST · UTC−4)</div>
            <div style="font-size:12px; color: var(--text-dim); margin-bottom:6px;">Default publishing window</div>
            <div style="font-size:13px; padding: 8px 10px; border: 1px solid var(--border); border-radius:6px;">7:00 AM – 9:00 PM AST</div>
          </div>
          <div data-pane="team" style="display:none;">
            <div style="font-size:14px; font-weight:600; margin-bottom:14px;">Team</div>
            <div style="display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--border);">
              <img src="assets/photos/austin-white.jpg" style="width:32px; height:32px; border-radius:50%; object-fit:cover;" alt="">
              <div style="flex:1;">
                <div style="font-size:13px; font-weight:500;">Austin White</div>
                <div style="font-size:11px; color: var(--text-dim);">rabbithole.pro.ai@gmail.com</div>
              </div>
              <span class="badge">Operator</span>
            </div>
            <div style="display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--border);">
              <div style="width:32px; height:32px; border-radius:50%; background:#6b4a35; color:white; display:grid; place-items:center; font-size:12px; font-weight:600;">JR</div>
              <div style="flex:1;">
                <div style="font-size:13px; font-weight:500;">Juan Ramirez</div>
                <div style="font-size:11px; color: var(--text-dim);">juan@magdalena1163.com</div>
              </div>
              <span class="badge">Owner</span>
            </div>
            <button class="btn btn-secondary mt-3" style="font-size:12px;">Invite team member</button>
          </div>
          <div data-pane="channels" style="display:none;">
            <div style="font-size:14px; font-weight:600; margin-bottom:14px;">Connected channels</div>
            <div style="display:flex; flex-direction:column; gap:8px; font-size:13px;">
              <div style="display:flex; align-items:center; gap:10px; padding:10px; border:1px solid var(--border); border-radius:6px;">
                <img src="assets/icons/instagram.svg" style="width:20px; height:20px;" alt=""><span style="flex:1;">Instagram · @magdalena1163</span><span class="badge badge-success">Connected</span>
              </div>
              <div style="display:flex; align-items:center; gap:10px; padding:10px; border:1px solid var(--border); border-radius:6px;">
                <img src="assets/icons/tiktok.svg" style="width:20px; height:20px;" alt=""><span style="flex:1;">TikTok · @magdalena1163</span><span class="badge badge-success">Connected</span>
              </div>
              <div style="display:flex; align-items:center; gap:10px; padding:10px; border:1px solid var(--border); border-radius:6px;">
                <img src="assets/icons/facebook.svg" style="width:20px; height:20px;" alt=""><span style="flex:1;">Facebook · Magdalena 1163</span><span class="badge badge-success">Connected</span>
              </div>
              <div style="display:flex; align-items:center; gap:10px; padding:10px; border:1px solid var(--border); border-radius:6px;">
                <img src="assets/icons/linkedin.svg" style="width:20px; height:20px;" alt=""><span style="flex:1;">LinkedIn · Magdalena 1163</span><span class="badge badge-success">Connected</span>
              </div>
              <div style="display:flex; align-items:center; gap:10px; padding:10px; border:1px solid var(--border); border-radius:6px;">
                <img src="assets/icons/google-ads.svg" style="width:20px; height:20px;" alt=""><span style="flex:1;">Google Ads</span><span class="badge badge-success">Connected</span>
              </div>
              <div style="display:flex; align-items:center; gap:10px; padding:10px; border:1px solid var(--border); border-radius:6px;">
                <img src="assets/icons/meta.svg" style="width:20px; height:20px;" alt=""><span style="flex:1;">Meta Ads</span><span class="badge badge-success">Connected</span>
              </div>
            </div>
          </div>
          <div data-pane="billing" style="display:none;">
            <div style="font-size:14px; font-weight:600; margin-bottom:14px;">Billing</div>
            <div style="padding:12px; border:1px solid var(--border); border-radius:8px; margin-bottom:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-size:13px; font-weight:600;">Maestro · Operator plan</div>
                  <div style="font-size:11px; color: var(--text-dim);">Single workspace · all channels · weekly digest included</div>
                </div>
                <span class="badge badge-success">Active</span>
              </div>
            </div>
            <div style="font-size:12px; color: var(--text-dim);">Next invoice · June 1, 2026</div>
          </div>
          <div data-pane="notifications" style="display:none;">
            <div style="font-size:14px; font-weight:600; margin-bottom:14px;">Notifications</div>
            <div style="display:flex; flex-direction:column; gap:10px; font-size:13px;">
              <label style="display:flex; align-items:center; gap:10px;"><input type="checkbox" checked> Weekly digest (Mondays 8 AM)</label>
              <label style="display:flex; align-items:center; gap:10px;"><input type="checkbox" checked> Post approvals waiting on me</label>
              <label style="display:flex; align-items:center; gap:10px;"><input type="checkbox" checked> Ad budget pacing alerts</label>
              <label style="display:flex; align-items:center; gap:10px;"><input type="checkbox"> Real-time channel errors</label>
            </div>
          </div>
        </div>
      </div>
    `;
    maestroModal({
      title: 'Settings',
      body,
      primary: { label: 'Save', value: 'save' },
      secondary: { label: 'Close' }
    }).then(r => {
      if (r === 'save' && typeof maestroToast === 'function') {
        maestroToast('Settings saved', { kind: 'success' });
      }
    });
    // Tab switching inside the modal.
    setTimeout(() => {
      const tabs = document.querySelectorAll('.set-tab');
      tabs.forEach(t => {
        t.addEventListener('click', () => {
          tabs.forEach(x => {
            x.classList.remove('active');
            x.style.background = '';
            x.style.color = 'var(--text-muted)';
            x.style.fontWeight = '';
          });
          t.classList.add('active');
          t.style.background = 'var(--accent-soft)';
          t.style.color = 'var(--accent)';
          t.style.fontWeight = '600';
          const key = t.dataset.tab;
          document.querySelectorAll('[data-pane]').forEach(p => {
            p.style.display = (p.dataset.pane === key) ? '' : 'none';
          });
        });
      });
    }, 50);
  }
})();
