// Analytics page controller.
(function () {
  const H = MaestroHelpers;

  // Date range select.
  const RANGES = {
    'Last 7 days':  { bookings: '11', revenue: '$7.2K', reach: '38K',  spend: '$1,240', hours: '9h' },
    'Last 30 days': { bookings: '42', revenue: '$28.6K', reach: '142K', spend: '$4,820', hours: '38h' },
    'Last 90 days': { bookings: '108', revenue: '$71.4K', reach: '418K', spend: '$13,200', hours: '116h' },
  };

  function updateRange(label) {
    const data = RANGES[label];
    if (!data) return;
    const metrics = document.querySelectorAll('.metric .metric-value');
    if (metrics[0]) metrics[0].textContent = data.bookings;
    if (metrics[1]) metrics[1].textContent = data.revenue;
    if (metrics[2]) metrics[2].textContent = data.reach;
    if (metrics[3]) metrics[3].textContent = data.spend;
    if (metrics[4]) metrics[4].textContent = data.hours;
    const sub = document.querySelector('.page-subtitle');
    if (sub) sub.innerHTML = `All channels · ${label.toLowerCase()} · refreshed 4 min ago · feeds back as learnings — every surface gets smarter`;
  }

  document.querySelectorAll('select.input').forEach(sel => {
    sel.addEventListener('change', () => {
      updateRange(sel.value);
      maestroToast(`Range: ${sel.value}`, { kind: 'info', duration: 1400 });
    });
  });

  // Bookings/Revenue toggle.
  H.bind(H.btnByText('Bookings'), (e, btn) => {
    document.querySelectorAll('button').forEach(b => {
      const t = b.textContent.trim();
      if (t === 'Revenue') b.className = b.className.replace('btn-secondary', 'btn-ghost');
    });
    btn.className = btn.className.replace('btn-ghost', 'btn-secondary');
    maestroToast('Showing bookings instead of revenue', { kind: 'info' });
  });
  H.bind(H.btnByText('Revenue'), (e, btn) => {
    document.querySelectorAll('button').forEach(b => {
      const t = b.textContent.trim();
      if (t === 'Bookings') b.className = b.className.replace('btn-secondary', 'btn-ghost');
    });
    btn.className = btn.className.replace('btn-ghost', 'btn-secondary');
    maestroToast('Showing revenue attribution', { kind: 'info' });
  });

  H.bind(H.btnByText('Export'), (e, btn) => {
    H.runAgent(btn, {
      label: 'Exporting...',
      durationMs: 1100,
      onDone: () => maestroToast('CSV exported · maestro-analytics-may-2026.csv', { kind: 'success' })
    });
  });

  H.bind(H.btnByText('Weekly digest'), () => {
    maestroModal({
      title: 'Weekly digest preview',
      body: `
        <p><strong>This week</strong></p>
        <p>8 posts published across 4 channels. Engagement up 31% MoM. "Crafted for the Curious" was the standout (4.8K likes, 6 attributable bookings). The "Morning, unhurried" atmosphere series continues to outperform — 2.4× the engagement of guest-focused content.</p>
        <p><strong>Ads</strong></p>
        <p>Junior Suite conversion campaign scaled +$200/day. "Romantic Getaway" paused for high CPA. New variants in queue.</p>
        <p><strong>Calendar</strong></p>
        <p>14 briefs queued for next week. Atmosphere ratio bumped to 50% based on last week's learnings.</p>
        <p><strong>Brand voice</strong></p>
        <p>Average copy voice-match 0.91. LinkedIn variant flagged once for "guest experience" usage — auto-regenerated.</p>
        <p style="color: var(--text-dim); font-size: 12px;">Sent every Monday 8 AM. Also available as exec-ready PDF.</p>
      `,
      primary: { label: 'Send now', value: 'send' },
      secondary: { label: 'Close' }
    }).then(r => { if (r === 'send') maestroToast('Weekly digest sent to Austin + Juan', { kind: 'success' }); });
  });

  H.bind(H.btnByText('View full digest'), () => {
    H.btnByText('Weekly digest').forEach(b => b.click());
  });
  H.bind(H.btnByText('Send now'), (e, btn) => {
    H.runAgent(btn, {
      label: 'Sending...',
      durationMs: 900,
      onDone: () => maestroToast('Digest sent · also queued for Monday\'s automated send', { kind: 'success' })
    });
  });

  // Post rows click → modal with detail.
  document.querySelectorAll('.flex.items-center.gap-3.p-3.rounded').forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => {
      const title = row.querySelector('.text-sm.font-medium')?.textContent.trim() || '';
      const meta = row.querySelector('.text-xs')?.textContent.trim() || '';
      const attribution = row.querySelector('.text-right')?.textContent.trim() || '';
      maestroModal({
        title,
        body: `<p>${meta}</p><p><strong>${attribution.split('$')[0]}</strong>$${attribution.split('$')[1] || ''}</p><p style="color: var(--text-dim); font-size: 12px;">Phase 1 will show the full attribution path: who clicked, when, what they viewed before booking.</p>`,
        primary: { label: 'Close', value: 'ok' }
      });
    });
  });
})();
