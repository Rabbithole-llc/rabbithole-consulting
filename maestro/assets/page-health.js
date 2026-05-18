// Health page controller.
(function () {
  const H = MaestroHelpers;

  // Run scan button — fake an async scan
  H.bind(H.btnByText('Run scan'), (e, btn) => {
    H.runAgent(btn, {
      label: 'Scanning...',
      durationMs: 2200,
      onDone: () => {
        maestroToast('Scan complete · no new issues detected', { kind: 'success' });
        const sub = document.querySelector('.page-subtitle');
        if (sub) sub.textContent = 'Marketing infrastructure check · 8 of 11 systems healthy · last scan just now';
      },
    });
  });

  // "Fix 3 missing →" header CTA
  H.bind(H.btnByText('Fix 3 missing →'), () => {
    maestroModal({
      title: 'Fix 3 missing systems',
      body: `
        <p style="color: var(--text-muted); margin-bottom: 14px;">Maestro will install and verify the following on magdalena1163.com:</p>
        <ul style="font-size: 14px; line-height: 1.9; color: var(--text); margin-bottom: 14px;">
          <li>· <strong>Meta Pixel</strong> + Conversions API (CAPI)</li>
          <li>· <strong>TikTok Pixel</strong></li>
          <li>· <strong>Email service tracking</strong> (Mailchimp / Klaviyo connector)</li>
        </ul>
        <p style="font-size: 12px; color: var(--text-dim);">Requires temporary access to your site CMS. Maestro adds tags, verifies they fire on a booking event, and revokes access when done.</p>
      `,
      primary: { label: 'Authorize & install', value: 'go' },
      secondary: { label: 'Cancel' }
    }).then(r => {
      if (r === 'go') {
        maestroToast('Install queued · Maestro will email Austin when complete', { kind: 'success', title: 'Authorized' });
      }
    });
  });

  // Authorize button in footer card
  H.bind(H.btnContains('Authorize Maestro to install'), () => {
    H.btnByText('Fix 3 missing →').forEach(b => b.click());
  });

  // Individual "Install" / "Fix" / "Review" / "Connect" buttons in rows
  document.querySelectorAll('.health-row .btn-primary, .health-row .btn-secondary').forEach(btn => {
    const label = btn.textContent.trim();
    if (label === 'Manage' || label === 'View') return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest('.health-row');
      const name = row?.querySelector('.name')?.textContent.trim() || 'System';
      maestroModal({
        title: `${label} · ${name}`,
        body: `<p style="color: var(--text-muted);">Maestro will guide you through ${label.toLowerCase()}ing ${name}. This typically takes 3–8 minutes and requires site access.</p>`,
        primary: { label: 'Start', value: 'go' },
        secondary: { label: 'Later' }
      }).then(r => {
        if (r === 'go') maestroToast(`${name} · install queued`, { kind: 'info' });
      });
    });
  });

  // "Manage" buttons → tiny modal that explains the integration
  document.querySelectorAll('.health-row .btn-ghost').forEach(btn => {
    const label = btn.textContent.trim();
    if (label !== 'Manage' && label !== 'View') return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest('.health-row');
      const name = row?.querySelector('.name')?.textContent.trim() || 'System';
      const desc = row?.querySelector('.desc')?.textContent.trim() || '';
      maestroModal({
        title: name,
        body: `<p style="color: var(--text-muted);">${desc}</p><p style="font-size: 12px; color: var(--text-dim); margin-top: 12px;">Phase 1 will surface full-fidelity controls inline here.</p>`,
        primary: { label: 'Close', value: 'ok' }
      });
    });
  });
})();
