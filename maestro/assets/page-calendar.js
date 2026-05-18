// Calendar page controller.
(function () {
  const H = MaestroHelpers;

  // Channel checkboxes (Instagram / TikTok / Facebook / LinkedIn) → toggle chips.
  const channelMap = { Instagram: 'ig', TikTok: 'tt', Facebook: 'fb', LinkedIn: 'li' };
  document.querySelectorAll('label.flex input[type="checkbox"]').forEach(cb => {
    const label = cb.closest('label');
    if (!label) return;
    const txt = label.textContent.trim();
    const ch = Object.keys(channelMap).find(k => txt.includes(k));
    if (!ch) return;
    cb.addEventListener('change', () => {
      const cls = channelMap[ch];
      document.querySelectorAll(`.post-chip.${cls}`).forEach(chip => {
        chip.style.display = cb.checked ? '' : 'none';
      });
      maestroToast(cb.checked ? `${ch} posts shown` : `${ch} posts hidden`, { kind: 'info', duration: 1400 });
    });
  });

  // View toggle (Month / Week / List).
  ['Month', 'Week', 'List'].forEach(v => {
    H.btnByText(v).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // Update active state styling.
        ['Month', 'Week', 'List'].forEach(other => {
          H.btnByText(other).forEach(b => {
            b.className = b.className.replace('btn-secondary', 'btn-ghost');
          });
        });
        btn.className = btn.className.replace('btn-ghost', 'btn-secondary');
        if (v !== 'Month') maestroToast(`${v} view · Phase 1 build`, { kind: 'info' });
      });
    });
  });

  // Day cell post-chips → show brief modal.
  document.querySelectorAll('.post-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const text = chip.textContent.trim();
      maestroModal({
        title: text,
        body: `
          <p><strong>Strategy brief</strong></p>
          <p>Open with a sensory line about the moment. Single image or short video. Soft CTA in profile. Hashtag set per channel.</p>
          <p style="color: var(--text-dim); font-size: 12px;">In Phase 1, clicking a chip opens the full brief drawer (visible at bottom of this page).</p>
        `,
        primary: { label: 'Open brief', value: 'open' },
        secondary: { label: 'Close' }
      });
    });
  });

  // Regenerate week button.
  H.bind(H.btnByText('Regenerate week'), (e, btn) => {
    H.runAgent(btn, {
      label: 'Regenerating week...',
      durationMs: 2400,
      toastMsg: 'Regenerating this week\'s briefs',
      onDone: () => {
        maestroToast('Regenerated 7 briefs for this week · 6 net new angles', { kind: 'success', title: 'Maestro' });
      }
    });
  });

  // New post button.
  H.bind(H.btnContains('New post'), () => location.href = 'creative.html');

  // April / June / Today navigation buttons.
  H.btnByText('April').forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    maestroToast('Navigated to April · 78 posts', { kind: 'info' });
  }));
  H.btnByText('June').forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    maestroToast('Navigated to June · calendar in progress', { kind: 'info' });
  }));
  H.btnByText('Today').forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector('.cal-day.today')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));

  // Brief drawer buttons at bottom.
  H.bind(H.btnContains('Generate creative'), () => location.href = 'creative.html');
  H.bind(H.btnContains('Write copy'), () => location.href = 'copy.html');
  H.bind(H.btnByText('Regenerate brief'), (e, btn) => {
    H.runAgent(btn, {
      label: 'Regenerating brief...',
      durationMs: 1600,
      toastMsg: 'Regenerating brief',
      onDone: () => {
        maestroToast('New brief generated · slightly different angle', { kind: 'success' });
      }
    });
  });
  H.bind(H.btnByText('Close'), () => {
    const drawer = document.querySelector('.card:has(.page-title)');
    if (drawer) { drawer.style.transition = 'opacity .3s'; drawer.style.opacity = '0.4'; }
    maestroToast('Brief drawer closed (would collapse in Phase 1)', { kind: 'info' });
  });
})();
