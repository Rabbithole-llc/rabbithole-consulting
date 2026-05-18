// Paid Ads page controller.
(function () {
  const H = MaestroHelpers;

  // ----- Top-level section tabs (Campaigns / Library / Budget / Performance) -----
  function showSection(key) {
    document.querySelectorAll('.section-tab').forEach(t => t.classList.toggle('active', t.dataset.section === key));
    document.querySelectorAll('[data-section-panel]').forEach(p => {
      const match = p.dataset.sectionPanel === key;
      if (match) {
        p.style.display = '';
        // Restart the panel-in animation
        p.style.animation = 'none';
        // eslint-disable-next-line no-unused-expressions
        p.offsetHeight;
        p.style.animation = '';
      } else {
        p.style.display = 'none';
      }
    });
    try { history.replaceState(null, '', '#' + key); } catch (e) {}
  }
  document.querySelectorAll('.section-tab').forEach(tab => {
    tab.addEventListener('click', () => showSection(tab.dataset.section));
  });
  // Honor a hash on load (e.g. /maestro/ads#library)
  const hashKey = (location.hash || '').replace('#','');
  if (hashKey && document.querySelector(`[data-section-panel="${hashKey}"]`)) {
    showSection(hashKey);
  }

  const CHANNEL_DATA = {
    'All channels':   { spend: '$4,820', bookings: '31', revenue: '$20.4K', roas: '4.2×', cpa: '$155' },
    'Google Ads':     { spend: '$2,140', bookings: '14', revenue: '$10.8K', roas: '5.0×', cpa: '$153' },
    'Meta (FB + IG)': { spend: '$1,810', bookings: '11', revenue: '$6.4K',  roas: '3.5×', cpa: '$165' },
    'TikTok':         { spend: '$620',   bookings: '5',  revenue: '$2.4K',  roas: '3.9×', cpa: '$124' },
    'LinkedIn':       { spend: '$250',   bookings: '1',  revenue: '$840',   roas: '3.4×', cpa: '$250' },
  };

  // Timings tuned so the text swap happens AFTER the fade-out completes,
  // eliminating the mid-transition glitch where the old value is still
  // partially visible during the swap.
  const FADE_OUT_MS = 260;   // matches the .metric-value transition
  const ROW_FADE_MS = 320;   // matches the tr opacity transition

  function updateKpiRow(channel) {
    const data = CHANNEL_DATA[channel];
    if (!data) return;
    const values = [data.spend, data.bookings, data.revenue, data.roas, data.cpa];
    const metrics = document.querySelectorAll('.metric .metric-value');
    // Fade out fully → swap text invisibly → fade back in.
    metrics.forEach(m => m.classList.add('swapping'));
    setTimeout(() => {
      metrics.forEach((m, i) => { if (values[i] !== undefined) m.textContent = values[i]; });
      // Two rAFs ensure the text change is committed before we start the fade-in transition.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          metrics.forEach(m => m.classList.remove('swapping'));
        });
      });
    }, FADE_OUT_MS + 20);   // small buffer past the transition end
  }

  function filterCampaignsByChannel(channelLabel) {
    const channelKey = channelLabel.includes('Google') ? 'Google'
      : channelLabel.includes('Meta') ? 'Meta'
      : channelLabel.includes('TikTok') ? 'TikTok'
      : channelLabel.includes('LinkedIn') ? 'LinkedIn'
      : 'all';
    const rows = document.querySelectorAll('table.table tbody tr');
    rows.forEach(row => {
      const text = row.cells?.[1]?.textContent || '';
      const keep = (channelKey === 'all') || text.includes(channelKey);
      if (keep) {
        // Reveal: ensure displayed first; then fade in on the next frame.
        if (row.style.display === 'none') {
          row.style.display = '';
          row.classList.add('row-hidden');   // start invisible so the upcoming remove fades it in
          // Force a layout flush before removing the class.
          // eslint-disable-next-line no-unused-expressions
          row.offsetHeight;
        }
        requestAnimationFrame(() => row.classList.remove('row-hidden'));
      } else {
        // Hide: fade out first; only collapse to display:none AFTER the fade completes.
        row.classList.add('row-hidden');
        setTimeout(() => {
          if (row.classList.contains('row-hidden')) row.style.display = 'none';
        }, ROW_FADE_MS + 20);
      }
    });
  }

  // Channel tabs.
  let channelClickLock = false;
  document.querySelectorAll('.channel-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      if (channelClickLock) return;
      if (tab.classList.contains('active')) return;
      channelClickLock = true;
      document.querySelectorAll('.channel-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const label = tab.textContent.trim().split('$')[0].trim();
      updateKpiRow(label);
      filterCampaignsByChannel(label);
      maestroToast(`Filtered to ${label}`, { kind: 'info', duration: 1400 });
      // Lock past the full sequence so back-to-back clicks queue cleanly.
      setTimeout(() => { channelClickLock = false; }, FADE_OUT_MS + 260);
    });
  });

  // Header buttons.
  H.bind(H.btnByText('Budget pacing'), () => {
    maestroModal({
      title: 'Budget pacing · May',
      body: `
        <p><strong>$4,820 spent / $6,000 budget</strong> · 80% used, day 16 of 31.</p>
        <p>Pacing is on track. At current rate: ~$9,400 end of month — but the Maestro will hold at $6,000 unless you raise the ceiling.</p>
        <p><strong>By channel:</strong></p>
        <p>· Google: $2,140 / $2,500 (86%)<br>· Meta: $1,810 / $2,200 (82%)<br>· TikTok: $620 / $900 (69%)<br>· LinkedIn: $250 / $400 (63%)</p>
      `,
      primary: { label: 'Raise budget', value: 'raise' },
      secondary: { label: 'Close' }
    }).then(r => { if (r === 'raise') maestroToast('Budget editor would open here', { kind: 'info' }); });
  });

  H.bind(H.btnByText('Ad library'), () => {
    maestroModal({
      title: 'Ad library',
      body: `<p><strong>24 ad variants live across 7 campaigns.</strong></p><p>Every ad variant is composed from the same image + copy library that powers organic. The Maestro generates fresh variants weekly and rotates underperformers out.</p><p style="color: var(--text-dim); font-size: 12px;">Full ad-library grid view in Phase 1.</p>`,
      primary: { label: 'Close', value: 'ok' }
    });
  });

  H.bind(H.btnByText('+ New campaign'), () => {
    maestroModal({
      title: 'New campaign',
      body: `
        <p>Campaign name: <input class="input" placeholder="e.g. Summer Bookings"></p>
        <p>Channel: <select class="input"><option>Google Ads</option><option>Meta (FB + IG)</option><option>TikTok</option><option>LinkedIn</option></select></p>
        <p>Budget: <input class="input" placeholder="$500/day"></p>
        <p>Objective: <select class="input"><option>Conversions</option><option>Reach</option><option>Engagement</option><option>Lead generation</option></select></p>
      `,
      primary: { label: 'Generate variants & launch', value: 'launch' },
      secondary: { label: 'Cancel' }
    }).then(r => {
      if (r === 'launch') {
        maestroToast('Campaign queued · Generating 5 variants', { kind: 'success', title: 'Maestro' });
      }
    });
  });

  // "+ Generate new variants" button.
  H.bind(H.btnContains('Generate new variants'), (e, btn) => {
    H.runAgent(btn, {
      label: 'Generating variants...',
      durationMs: 2200,
      toastMsg: 'Generating 3 new variants from current brief',
      onDone: () => maestroToast('3 new variants ready · auto-launched at 10% budget', { kind: 'success' })
    });
  });

  H.bind(H.btnByText('Filter'), () => {
    maestroToast('Filter by status, channel, objective, or date range', { kind: 'info' });
  });

  // Per-row View buttons.
  document.querySelectorAll('table.table tbody tr').forEach(row => {
    const viewBtn = [...row.querySelectorAll('button')].find(b => b.textContent.trim() === 'View');
    if (viewBtn) {
      viewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const name = row.querySelector('.font-medium.text-sm')?.textContent.trim() || 'Campaign';
        const channel = row.cells?.[1]?.textContent.trim() || '';
        maestroModal({
          title: name,
          body: `<p><strong>${channel}</strong></p><p>${row.querySelector('.text-xs')?.textContent.trim() || ''}</p><p style="color: var(--text-dim); font-size: 12px;">Phase 1 will show the full campaign detail: variant performance, audience makeup, day-by-day spend, attribution path.</p>`,
          primary: { label: 'Close', value: 'ok' }
        });
      });
    }
  });

  // ----- New Ad Library / Budget / Performance interactions -----

  // Variant cards (Ad Library tab) → quick modal preview
  document.querySelectorAll('.ad-variant-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const headline = card.querySelector('.ad-variant-headline')?.textContent.trim() || '';
      const meta = card.querySelector('.ad-variant-meta')?.textContent.trim() || '';
      const channel = card.querySelector('.channel-pill')?.textContent.trim() || '';
      const status = card.querySelector('.status-pill')?.textContent.trim() || '';
      const bg = card.querySelector('.ad-variant-creative')?.style.backgroundImage || '';
      maestroModal({
        title: 'Ad variant',
        body: `
          <div style="aspect-ratio: 1/1; background-image: ${bg}; background-size: cover; background-position: center; border-radius: 8px; margin-bottom: 14px;"></div>
          <div style="font-size: 15px; font-weight: 500; margin-bottom: 8px;">${headline}</div>
          <div style="display: flex; gap: 10px; font-size: 12px; color: var(--text-dim); flex-wrap: wrap;"><span>${channel}</span><span>·</span><span>${status}</span><span>·</span><span>${meta}</span></div>
          <p style="font-size: 12px; color: var(--text-dim); margin-top: 14px;">Phase 1 will surface audience makeup, day-by-day spend, full attribution path, and the prompt that generated this variant.</p>
        `,
        primary: { label: 'Close', value: 'ok' }
      });
    });
  });

  // "Apply recommendation" — Budget panel
  H.bind(H.btnByText('Apply recommendation'), (e, btn) => {
    H.runAgent(btn, {
      label: 'Applying...',
      durationMs: 1200,
      onDone: () => maestroToast('Daily caps adjusted · +$200/day to Junior Suite, Romantic Getaway stays paused', { kind: 'success' })
    });
  });
  H.bind(H.btnByText('Change'), () => {
    maestroToast('Spend cap editor would open here', { kind: 'info' });
  });
  H.bind(H.btnByText('+ Generate variants'), (e, btn) => {
    H.runAgent(btn, {
      label: 'Generating...',
      durationMs: 1800,
      onDone: () => maestroToast('3 new variants drafted · awaiting your review', { kind: 'success' })
    });
  });
})();
