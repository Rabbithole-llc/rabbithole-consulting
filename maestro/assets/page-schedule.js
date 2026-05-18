// Publishing Queue page controller.
(function () {
  const H = MaestroHelpers;

  function rowStatus(row) {
    const badge = row.querySelector('.badge');
    if (!badge) return 'unknown';
    const t = badge.textContent.trim().toLowerCase();
    if (t.includes('await')) return 'in_review';
    if (t.includes('schedul')) return 'scheduled';
    if (t.includes('publish')) return 'published';
    if (t.includes('fail')) return 'failed';
    return 'unknown';
  }

  function updateRowAsApproved(row) {
    const badge = row.querySelector('.badge');
    if (badge) {
      badge.className = 'badge badge-info';
      badge.innerHTML = '<span class="dot dot-info"></span> Scheduled';
    }
    // Update approver text.
    const approverCell = row.cells?.[5];
    if (approverCell) approverCell.innerHTML = '<span class="text-sm" style="color:var(--text-muted);">Just now</span>';
    // Swap Approve button to View.
    const btnContainer = row.cells?.[6];
    if (btnContainer) {
      btnContainer.innerHTML = '<div class="flex gap-1"><button class="btn btn-secondary" style="font-size:11px; padding:4px 8px;">View</button><button class="btn btn-ghost" style="font-size:11px; padding:4px 6px;">···</button></div>';
    }
    row.classList.add('fade-in');
  }

  // Wire Approve buttons inside table rows.
  function wireApproveButtons() {
    document.querySelectorAll('table.table tbody tr').forEach(row => {
      const approveBtn = [...row.querySelectorAll('button')].find(b => b.textContent.trim() === 'Approve');
      if (approveBtn && !approveBtn.dataset.wired) {
        approveBtn.dataset.wired = '1';
        approveBtn.addEventListener('click', (e) => {
          e.preventDefault();
          updateRowAsApproved(row);
          // Reflect in shared state.
          const lead = row.querySelector('td:nth-child(2) .text-xs')?.textContent.trim() || '';
          MaestroState.update(s => {
            const post = s.posts.find(p => lead.includes(p.captionLead.slice(0, 25).replace(/^"/, '').replace(/\\"/g, '"')));
            if (post) { post.status = 'scheduled'; post.approver = 'Just now'; }
          });
          maestroToast('Post approved · scheduled', { kind: 'success' });
        });
      }
      const retryBtn = [...row.querySelectorAll('button')].find(b => b.textContent.trim() === 'Retry');
      if (retryBtn && !retryBtn.dataset.wired) {
        retryBtn.dataset.wired = '1';
        retryBtn.addEventListener('click', (e) => {
          e.preventDefault();
          H.runAgent(retryBtn, {
            label: 'Retrying...',
            durationMs: 1500,
            toastMsg: 'Re-attempting publish',
            onDone: () => {
              const badge = row.querySelector('.badge');
              if (badge) {
                badge.className = 'badge badge-success';
                badge.innerHTML = '<span class="dot dot-success"></span> Published';
              }
              maestroToast('Post published successfully on retry', { kind: 'success' });
            }
          });
        });
      }
      const viewBtn = [...row.querySelectorAll('button')].find(b => b.textContent.trim() === 'View');
      if (viewBtn && !viewBtn.dataset.wired) {
        viewBtn.dataset.wired = '1';
        viewBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const title = row.querySelector('.font-medium.text-sm')?.textContent.trim() || 'Post';
          const channel = row.querySelector('td:nth-child(3)')?.textContent.trim() || '';
          const scheduled = row.querySelector('td:nth-child(4)')?.textContent.trim() || '';
          maestroModal({
            title,
            body: `<p><strong>${channel}</strong> · ${scheduled}</p><p>${row.querySelector('.text-xs')?.textContent.trim() || ''}</p><p style="color: var(--text-dim); font-size: 12px;">Phase 1 will show the full post preview here including image, copy variants, and live performance once published.</p>`,
            primary: { label: 'Close', value: 'ok' }
          });
        });
      }
    });
  }
  wireApproveButtons();

  // Filter tabs (All status, Awaiting, Scheduled, Failed, Published).
  function applyFilter(status) {
    document.querySelectorAll('table.table tbody tr').forEach(row => {
      const s = rowStatus(row);
      if (status === 'all') row.style.display = '';
      else row.style.display = s === status ? '' : 'none';
    });
  }
  const filterMap = { 'All status': 'all', 'Awaiting approval (4)': 'in_review', 'Scheduled (15)': 'scheduled', 'Failed (1)': 'failed', 'Published (210)': 'published' };
  Object.keys(filterMap).forEach(label => {
    H.btnContains(label.split(' (')[0]).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        Object.keys(filterMap).forEach(lab => {
          H.btnContains(lab.split(' (')[0]).forEach(b => {
            const isSec = b.className.includes('btn-secondary');
            b.className = b.className.replace('btn-secondary', 'btn-ghost');
          });
        });
        btn.className = btn.className.replace('btn-ghost', 'btn-secondary');
        applyFilter(filterMap[label]);
        maestroToast(`Filter: ${label}`, { kind: 'info', duration: 1400 });
      });
    });
  });

  // Search input.
  document.querySelectorAll('input.input').forEach(inp => {
    if (inp.placeholder?.toLowerCase().includes('search')) {
      inp.addEventListener('input', () => {
        const q = inp.value.toLowerCase().trim();
        document.querySelectorAll('table.table tbody tr').forEach(row => {
          if (!q) { row.style.display = ''; return; }
          row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
      });
    }
  });

  // "Filter by channel" header button.
  H.bind(H.btnContains('Filter by channel'), () => {
    maestroToast('Channel filters available via top tabs · per-channel filter in Phase 1', { kind: 'info' });
  });

  // Connected accounts / approval rules / + Connect another channel.
  H.bind(H.btnContains('Connect another channel'), () => {
    maestroModal({
      title: 'Connect another channel',
      body: `<p>Connect any of: Pinterest, YouTube, X (Twitter), Threads, Bluesky.</p><p style="color: var(--text-dim); font-size: 12px;">OAuth flow opens here. The user never sees the underlying provider name.</p>`,
      primary: { label: 'Open connector', value: 'open' },
      secondary: { label: 'Cancel' }
    });
  });

  // Approval rule "Enable" buttons.
  document.querySelectorAll('button').forEach(b => {
    if (b.textContent.trim() === 'Enable') {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        const card = b.closest('.flex.items-start.justify-between');
        const title = card?.querySelector('.text-sm.font-medium')?.textContent.trim() || '';
        // Move Active badge here.
        document.querySelectorAll('.badge-info').forEach(badge => {
          if (badge.textContent.trim() === 'Active') {
            const oldCard = badge.closest('.flex.items-start.justify-between');
            if (oldCard) oldCard.style.opacity = '0.7';
            badge.replaceWith(Object.assign(document.createElement('button'), { className: 'btn btn-ghost', style: 'font-size:11px;', textContent: 'Enable' }));
          }
        });
        if (card) {
          card.style.opacity = '1';
          const newBadge = document.createElement('span');
          newBadge.className = 'badge badge-info';
          newBadge.textContent = 'Active';
          b.replaceWith(newBadge);
        }
        maestroToast(`Activated: ${title}`, { kind: 'success' });
        // Re-wire the now-enabled "Enable" buttons.
        setTimeout(() => {
          // Recurse to wire new Enable buttons.
        }, 50);
      });
    }
  });

  // Header navigation.
  H.bind(H.btnContains('Connected accounts'), () => {
    document.querySelectorAll('.card-title').forEach(t => {
      if (t.textContent.includes('Connected accounts')) t.scrollIntoView({ behavior: 'smooth' });
    });
  });
  H.bind(H.btnByText('Publish history'), () => {
    applyFilter('published');
    maestroToast('Showing published posts only', { kind: 'info' });
  });
  H.bind(H.btnContains('Schedule post'), () => location.href = 'creative.html');

  // "···" overflow buttons.
  document.querySelectorAll('button').forEach(b => {
    if (b.textContent.trim() === '···') {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        maestroToast('Reschedule · Duplicate · Delete · View history', { kind: 'info', title: 'Actions' });
      });
    }
  });

  // ----- View toggle (Table / Calendar / List) -----
  document.querySelectorAll('.view-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const target = toggle.dataset.view;
      document.querySelectorAll('.view-toggle').forEach(t => {
        t.className = t.className.replace('btn-secondary', 'btn-ghost').replace('active', '').trim();
      });
      toggle.className = toggle.className.replace('btn-ghost', 'btn-secondary') + ' active';
      document.querySelectorAll('.view-pane').forEach(pane => {
        pane.classList.add('hidden');
        if (pane.dataset.viewPane === target) pane.classList.remove('hidden');
      });
      maestroToast(`View: ${target.charAt(0).toUpperCase() + target.slice(1)}`, { kind: 'info', duration: 1200 });
    });
  });

  // ----- Bulk-select on table rows -----
  const bulkBar = document.getElementById('bulk-bar');
  const bulkCount = document.getElementById('bulk-count');
  const selectAll = document.getElementById('select-all-rows');
  const rowChecks = document.querySelectorAll('.row-check');

  function updateBulkBar() {
    const count = document.querySelectorAll('.row-check:checked').length;
    if (count === 0) {
      bulkBar.classList.add('hidden');
    } else {
      bulkBar.classList.remove('hidden');
      bulkCount.textContent = `${count} selected`;
    }
  }

  rowChecks.forEach(cb => {
    cb.addEventListener('change', () => {
      const row = cb.closest('tr');
      if (row) row.style.background = cb.checked ? 'var(--accent-soft)' : '';
      updateBulkBar();
    });
  });

  if (selectAll) {
    selectAll.addEventListener('change', () => {
      rowChecks.forEach(cb => {
        cb.checked = selectAll.checked;
        const row = cb.closest('tr');
        if (row) row.style.background = cb.checked ? 'var(--accent-soft)' : '';
      });
      updateBulkBar();
    });
  }

  // ----- Bulk actions -----
  document.querySelectorAll('[data-bulk-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const action = btn.dataset.bulkAction;
      const checked = document.querySelectorAll('.row-check:checked');
      const count = checked.length;

      if (action === 'approve') {
        maestroToast(`Approving ${count} posts...`, { kind: 'agent', duration: 1500 });
        setTimeout(() => {
          checked.forEach(cb => {
            const row = cb.closest('tr');
            if (!row) return;
            const badge = row.querySelector('.badge');
            if (badge && badge.textContent.includes('Awaiting')) {
              badge.className = 'badge badge-info';
              badge.innerHTML = '<span class="dot dot-info"></span> Scheduled';
            }
            cb.checked = false;
            row.style.background = '';
          });
          updateBulkBar();
          maestroToast(`${count} posts approved · scheduled for publish`, { kind: 'success' });
        }, 900);
      } else if (action === 'reschedule') {
        maestroModal({
          title: `Reschedule ${count} posts`,
          body: `<p>Push these posts to a new window. The Maestro will redistribute across optimal times in the new range.</p>
            <p><strong>New window:</strong>
              <select class="input" style="display:inline-block; width:200px; margin-left:8px;">
                <option>Next week</option>
                <option>Next 2 weeks</option>
                <option>Custom range</option>
              </select>
            </p>
            <p><strong>Spacing:</strong>
              <select class="input" style="display:inline-block; width:200px; margin-left:8px;">
                <option>AI-optimal times</option>
                <option>Same time-of-day as current</option>
                <option>Even distribution</option>
              </select>
            </p>`,
          primary: { label: 'Reschedule', value: 'go' },
          secondary: { label: 'Cancel' }
        }).then(r => {
          if (r === 'go') {
            checked.forEach(cb => { cb.checked = false; cb.closest('tr').style.background = ''; });
            updateBulkBar();
            maestroToast(`${count} posts rescheduled`, { kind: 'success' });
          }
        });
      } else if (action === 'delete') {
        maestroModal({
          title: `Delete ${count} posts?`,
          body: `<p>This removes them from the queue. The underlying creatives stay in the Media Library.</p>`,
          primary: { label: 'Delete', value: 'go' },
          secondary: { label: 'Cancel' }
        }).then(r => {
          if (r === 'go') {
            checked.forEach(cb => {
              const row = cb.closest('tr');
              row.style.transition = 'opacity .3s';
              row.style.opacity = '0';
              setTimeout(() => row.style.display = 'none', 320);
            });
            setTimeout(() => updateBulkBar(), 350);
            maestroToast(`${count} posts deleted`, { kind: 'success' });
          }
        });
      } else if (action === 'clear') {
        checked.forEach(cb => { cb.checked = false; cb.closest('tr').style.background = ''; });
        if (selectAll) selectAll.checked = false;
        updateBulkBar();
      }
    });
  });

  // ----- Calendar view: clicking a post-chip opens its detail -----
  document.querySelectorAll('.view-pane[data-view-pane="calendar"] .post-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const text = chip.textContent.trim();
      maestroModal({
        title: text,
        body: `<p>In the Calendar view, posts are draggable to reschedule. Click reveals the post detail, copy variants, and the underlying creative.</p><p style="color: var(--text-dim); font-size: 12px;">This canned demo shows the visual; live drag interactions ship with the React build.</p>`,
        primary: { label: 'Close', value: 'ok' }
      });
    });
  });
})();
