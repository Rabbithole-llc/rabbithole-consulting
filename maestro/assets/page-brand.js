// Brand Context page controller.
(function () {
  const H = MaestroHelpers;

  H.bind(H.btnByText('Edit context'), () => {
    maestroModal({
      title: 'Edit Brand Context',
      body: `
        <p>The full editor will let you revise voice, audience, do-say, don't-say, and visual style sections inline. Changes create a new version automatically.</p>
        <p style="color: var(--text-dim); font-size: 12px;">In Phase 1, this opens an inline markdown editor with diff view against the previous version. For now: edit and save creates v13.</p>
      `,
      primary: { label: 'Open editor', value: 'edit' },
      secondary: { label: 'Cancel' }
    }).then(r => {
      if (r === 'edit') maestroToast('Editor would open here · Phase 1 build', { kind: 'info' });
    });
  });

  H.bind(H.btnByText('Version history'), () => {
    maestroModal({
      title: 'Version history',
      body: `
        <p><strong>v12 · 3 days ago</strong> · Added "the night porter's name (Reynaldo)" to do-say.</p>
        <p><strong>v11 · 6 days ago</strong> · Added CDMX as secondary audience market.</p>
        <p><strong>v10 · 11 days ago</strong> · Added unripe-quenepa green to visual style. Removed "tropical" descriptors.</p>
        <p><strong>v9 · 2 weeks ago</strong> · Banned "elevate," "paradise," "hidden gem."</p>
        <p><strong>v8 · 3 weeks ago</strong> · Initial visual style codification.</p>
        <p style="color: var(--text-dim); font-size: 12px;">Brand Context is versioned automatically on every change. Roll back any version with one click in Phase 1.</p>
      `,
      primary: { label: 'Close', value: 'close' }
    });
  });

  // Smart suggestion: Add → mark dismissed and toast.
  const suggestionCard = document.querySelector('.card[style*="accent-soft"]');
  if (suggestionCard) {
    const addBtn = [...suggestionCard.querySelectorAll('button')].find(b => b.textContent.trim() === 'Add');
    const dismissBtn = [...suggestionCard.querySelectorAll('button')].find(b => b.textContent.trim() === 'Dismiss');
    if (addBtn) addBtn.addEventListener('click', (e) => {
      e.preventDefault();
      MaestroState.update(s => { s.brandContext.suggestionDismissed = true; s.brandContext.doSay = s.brandContext.doSay.concat(['"the courtyard"']); s.brandContext.version += 1; });
      suggestionCard.style.transition = 'opacity .3s';
      suggestionCard.style.opacity = '0';
      setTimeout(() => suggestionCard.style.display = 'none', 320);
      maestroToast('Added "the courtyard" to do-say · v13 created', { kind: 'success' });
    });
    if (dismissBtn) dismissBtn.addEventListener('click', (e) => {
      e.preventDefault();
      MaestroState.update(s => { s.brandContext.suggestionDismissed = true; });
      suggestionCard.style.transition = 'opacity .3s';
      suggestionCard.style.opacity = '0';
      setTimeout(() => suggestionCard.style.display = 'none', 320);
      maestroToast('Suggestion dismissed', { kind: 'info' });
    });
  }

  // Restore suggestion-dismissed state.
  if (MaestroState.get().brandContext.suggestionDismissed && suggestionCard) {
    suggestionCard.style.display = 'none';
  }

  // "Where this gets used" rows navigate to that agent.
  const targets = { 'Strategy': 'calendar.html', 'Image': 'creative.html', 'Copy': 'copy.html', 'Schedule': 'schedule.html', 'Ads': 'ads.html', 'Analytics': 'analytics.html' };
  document.querySelectorAll('.card').forEach(card => {
    const title = card.querySelector('.card-title');
    if (!title || title.textContent.trim() !== 'Where this gets used') return;
    card.querySelectorAll('.space-y-2 > div').forEach(row => {
      const name = row.querySelector('span:first-child')?.textContent.trim();
      if (targets[name]) {
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => location.href = targets[name]);
      }
    });
  });
})();
