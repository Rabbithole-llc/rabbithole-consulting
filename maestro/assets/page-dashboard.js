// Dashboard page controller.
(function () {
  const H = MaestroHelpers;
  const S = MaestroState.get();

  // Update today's queue rows based on state.
  function renderQueue() {
    const s = MaestroState.get();
    // Match each row by post title in the today's queue card.
    const rows = document.querySelectorAll('.card .space-y-3 > div');
    rows.forEach(row => {
      const titleEl = row.querySelector('.truncate');
      if (!titleEl) return;
      const lead = titleEl.textContent.trim();
      const post = s.posts.find(p => lead.includes(p.captionLead.slice(0, 30).replace(/^"/, '').replace(/\\"/g, '"')));
      if (!post) return;
      const badge = row.querySelector('.badge');
      const button = row.querySelector('button');
      if (post.status === 'scheduled' || post.status === 'approved') {
        if (badge) {
          badge.className = 'badge badge-success';
          badge.innerHTML = '<span class="dot dot-success"></span> Approved';
        }
        if (button) {
          button.className = 'btn btn-ghost';
          button.textContent = 'Scheduled';
        }
      } else if (post.status === 'published') {
        if (badge) {
          badge.className = 'badge badge-info';
          badge.innerHTML = '<span class="dot dot-info"></span> Published';
        }
        if (button) {
          button.className = 'btn btn-ghost';
          button.textContent = 'View';
        }
      }
    });
  }

  // Wire "Review" / "Scheduled" buttons in today's queue.
  document.querySelectorAll('.card .space-y-3 > div').forEach(row => {
    const button = row.querySelector('button');
    if (!button) return;
    const title = row.querySelector('.text-sm.truncate');
    if (!title) return;
    const captionLead = title.textContent.trim();

    button.addEventListener('click', async () => {
      if (button.textContent.trim() === 'Review') {
        const channel = row.querySelector('.text-xs').textContent.trim();
        const result = await maestroModal({
          title: 'Review post',
          body: `<p><strong>${channel}</strong></p><p>${captionLead}</p><p style="color: var(--text-dim); font-size: 12px;">This will move the post into the scheduled queue. The Maestro will publish it at the indicated time.</p>`,
          primary: { label: 'Approve & schedule', value: 'approve' },
          secondary: { label: 'Cancel' }
        });
        if (result === 'approve') {
          const s = MaestroState.get();
          const post = s.posts.find(p => captionLead.includes(p.captionLead.slice(0, 30).replace(/^"/, '').replace(/\\"/g, '"')));
          if (post) MaestroState.approvePost(post.id);
          renderQueue();
          maestroToast('Post approved · added to publishing queue', { kind: 'success' });
        }
      } else if (button.textContent.trim() === 'Scheduled') {
        maestroToast('Already scheduled. Open the Publishing Queue to manage.', { kind: 'info' });
      }
    });
  });

  // Wire top-right header buttons.
  H.bind(H.btnByText("Generate Week's Calendar"), (e, btn) => {
    H.runAgent(btn, {
      label: 'Generating calendar...',
      durationMs: 2200,
      toastMsg: 'Generating next week\'s briefs',
      onDone: () => {
        maestroToast('Generated 12 briefs for next week', { kind: 'success', title: 'Maestro' });
      }
    });
  });

  H.bind(H.btnByText('New Post'), () => { location.href = 'creative.html'; });

  // Wire the "View all →" link in queue card.
  H.bind(H.btnContains('View all'), () => { location.href = 'schedule.html'; });

  // Wire the "Needs attention" alert rows.
  document.querySelectorAll('.space-y-3 .flex.items-start.gap-2').forEach(row => {
    const badge = row.querySelector('.badge');
    if (!badge) return;
    const text = badge.textContent.trim();
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => {
      if (text === 'Ads') location.href = 'ads.html';
      else if (text === 'Copy') location.href = 'copy.html';
      else if (text === 'Calendar') location.href = 'calendar.html';
    });
  });

  // Initial render reflects state.
  renderQueue();
  MaestroState.subscribe(renderQueue);
})();
