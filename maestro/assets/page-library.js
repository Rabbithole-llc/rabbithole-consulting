// Media Library page controller.
(function () {
  const H = MaestroHelpers;
  const selected = new Set();
  const bulkBar = document.getElementById('bulk-bar');
  const bulkCount = document.getElementById('bulk-count');

  function updateBulkBar() {
    if (selected.size === 0) {
      bulkBar.classList.add('hidden');
    } else {
      bulkBar.classList.remove('hidden');
      bulkCount.textContent = `${selected.size} selected`;
    }
  }

  // Tile click → toggle selection.
  document.querySelectorAll('.lib-tile').forEach((tile, idx) => {
    tile.dataset.id = 'asset-' + idx;
    tile.addEventListener('click', (e) => {
      // Don't toggle if clicking the check icon (handle separately if needed)
      tile.classList.toggle('selected');
      const id = tile.dataset.id;
      if (tile.classList.contains('selected')) selected.add(id);
      else selected.delete(id);
      updateBulkBar();
    });
  });

  // Upload zone — drag/drop + click to open file picker.
  const uploadZone = document.getElementById('upload-zone');
  uploadZone.addEventListener('click', () => {
    triggerFakeUpload();
  });
  ['dragenter', 'dragover'].forEach(evt => {
    uploadZone.addEventListener(evt, (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    uploadZone.addEventListener(evt, (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
    });
  });
  uploadZone.addEventListener('drop', (e) => {
    triggerFakeUpload(e.dataTransfer?.files?.length || null);
  });

  function triggerFakeUpload(fileCount = null) {
    const count = fileCount || (Math.floor(Math.random() * 12) + 6);
    maestroToast(`Uploading ${count} files...`, { kind: 'agent', title: 'Maestro', duration: 2400 });
    // Simulate auto-tagging delay then announce
    setTimeout(() => {
      maestroToast(`${count} files uploaded · auto-tagging in progress`, { kind: 'info', duration: 2000 });
    }, 1200);
    setTimeout(() => {
      maestroToast(`Tagged ${count} files · subject, mood, palette, channel fit`, { kind: 'success', title: 'Maestro' });
      // Visually add a placeholder tile or two at the top of the grid
      addFakeUploadedTiles(Math.min(count, 4));
    }, 2800);
  }

  function addFakeUploadedTiles(n) {
    const grid = document.getElementById('asset-grid');
    if (!grid) return;
    const photos = [
      'magdalena-room-waiting.jpg',
      'magdalena-rooftop-lounge.jpg',
      'magdalena-armchair.jpg',
      'magdalena-two-bedroom.jpg',
      'magdalena-exterior.jpg',
      'magdalena-curtains-window.jpg',
      'magdalena-couple-sunset.jpg',
      'magdalena-lobby.jpg',
    ];
    for (let i = 0; i < n; i++) {
      const p = photos[(Date.now() + i) % photos.length];
      const tile = document.createElement('div');
      tile.className = 'lib-tile fade-in';
      tile.dataset.source = 'uploaded';
      tile.dataset.used = 'no';
      tile.dataset.id = 'asset-new-' + Date.now() + '-' + i;
      tile.innerHTML = `
        <div class="tile-bg" style="background-image:url('assets/photos/${p}'); background-size:cover; background-position:center;"></div>
        <div class="tile-badges"><span class="src-badge">Uploaded</span><span class="src-badge" style="background: rgba(184, 146, 79, 0.92); color: white;">NEW</span></div>
        <div class="tile-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div class="tile-meta">Just uploaded · auto-tagged</div>
      `;
      tile.addEventListener('click', () => {
        tile.classList.toggle('selected');
        const id = tile.dataset.id;
        if (tile.classList.contains('selected')) selected.add(id);
        else selected.delete(id);
        updateBulkBar();
      });
      grid.prepend(tile);
    }
  }

  // Header buttons.
  H.bind(H.btnByText('Upload files'), () => triggerFakeUpload());
  H.bind(H.btnByText('Import from Drive'), () => {
    maestroModal({
      title: 'Import from Google Drive',
      body: `<p>Connect a Drive folder and Maestro auto-imports new files as they're added. Useful for handing off shoots from photographers without copying files manually.</p><p style="color: var(--text-dim); font-size: 12px;">Also supported: Dropbox, OneDrive, S3 bucket, FTP. One-time auth, then runs in the background.</p>`,
      primary: { label: 'Connect Drive', value: 'connect' },
      secondary: { label: 'Cancel' }
    }).then(r => { if (r === 'connect') maestroToast('Drive folder watch enabled · checking every 5 min', { kind: 'success' }); });
  });
  H.bind(H.btnByText('Generate new'), () => location.href = 'creative.html');

  // Filter chips.
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      // Only the source row uses single-select active state for now.
      const filter = chip.dataset.filter;
      if (filter) {
        document.querySelectorAll('.filter-chip[data-filter]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        // Apply filter
        document.querySelectorAll('.lib-tile').forEach(tile => {
          if (filter === 'all') { tile.style.display = ''; return; }
          if (filter === 'uploaded') { tile.style.display = tile.dataset.source === 'uploaded' ? '' : 'none'; return; }
          if (filter === 'generated') { tile.style.display = tile.dataset.source === 'generated' ? '' : 'none'; return; }
          if (filter === 'unused') { tile.style.display = tile.dataset.used === 'no' ? '' : 'none'; return; }
          if (filter === 'used') { tile.style.display = tile.dataset.used === 'yes' ? '' : 'none'; return; }
        });
        maestroToast(`Filter: ${chip.textContent.trim()}`, { kind: 'info', duration: 1200 });
      } else {
        chip.classList.toggle('active');
        maestroToast(`Channel filter: ${chip.textContent.trim()}`, { kind: 'info', duration: 1200 });
      }
    });
  });

  // Search input.
  document.querySelectorAll('input.input').forEach(inp => {
    if (inp.placeholder?.toLowerCase().includes('search')) {
      inp.addEventListener('input', () => {
        const q = inp.value.toLowerCase().trim();
        document.querySelectorAll('.lib-tile').forEach(tile => {
          if (!q) { tile.style.display = ''; return; }
          const meta = tile.querySelector('.tile-meta')?.textContent.toLowerCase() || '';
          tile.style.display = meta.includes(q) ? '' : 'none';
        });
      });
    }
  });

  // Sort select.
  document.querySelectorAll('select.input').forEach(sel => {
    sel.addEventListener('change', () => {
      maestroToast(`Sorted by: ${sel.value}`, { kind: 'info', duration: 1400 });
    });
  });

  // Bulk action buttons.
  document.querySelectorAll('[data-bulk-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.bulkAction;
      const count = selected.size;
      if (action === 'schedule') {
        openAutoScheduleModal(count);
      } else if (action === 'tag') {
        maestroModal({
          title: `Tag ${count} assets`,
          body: `<p>Add tags to organize, e.g. <code>summer-2026</code>, <code>blue-door</code>, <code>cocktails</code>.</p><p><input class="input" placeholder="Type tags, press Enter..."></p>`,
          primary: { label: 'Apply tags', value: 'apply' },
          secondary: { label: 'Cancel' }
        }).then(r => { if (r === 'apply') maestroToast(`${count} assets tagged`, { kind: 'success' }); });
      } else if (action === 'download') {
        maestroToast(`Preparing ${count}-file zip · email when ready`, { kind: 'info' });
      } else if (action === 'archive') {
        maestroModal({
          title: `Archive ${count} assets?`,
          body: `<p>Archived assets are hidden from the library but kept available for 90 days. After that they're permanently deleted unless restored.</p>`,
          primary: { label: 'Archive', value: 'archive' },
          secondary: { label: 'Cancel' }
        }).then(r => {
          if (r === 'archive') {
            document.querySelectorAll('.lib-tile.selected').forEach(t => {
              t.style.transition = 'opacity .3s';
              t.style.opacity = '0';
              setTimeout(() => t.style.display = 'none', 320);
            });
            selected.clear();
            updateBulkBar();
            maestroToast(`${count} assets archived`, { kind: 'success' });
          }
        });
      }
    });
  });

  function openAutoScheduleModal(count) {
    maestroModal({
      title: `Auto-schedule ${count} assets`,
      body: `
        <p>The Maestro will distribute the selected creatives across the chosen channels and window, using your historical best-posting times per channel. The Maestro will generate per-platform captions in your brand voice. Everything lands in the Publishing Queue for your approval.</p>
        <p style="margin-top: 14px;"><strong>Distribute across:</strong></p>
        <p style="display: flex; gap: 10px; flex-wrap: wrap; font-size: 13px;">
          <label><input type="checkbox" checked> Instagram</label>
          <label><input type="checkbox" checked> TikTok</label>
          <label><input type="checkbox" checked> Facebook</label>
          <label><input type="checkbox"> LinkedIn</label>
        </p>
        <p style="margin-top: 14px;"><strong>Window:</strong>
          <select class="input" style="display:inline-block; width: 200px; margin-left: 8px;">
            <option>Next 4 weeks</option>
            <option>Next 6 weeks</option>
            <option>Next 8 weeks</option>
            <option>Next 12 weeks</option>
            <option>Custom range</option>
          </select>
        </p>
        <p style="margin-top: 14px;"><strong>Posting times:</strong>
          <select class="input" style="display:inline-block; width: 200px; margin-left: 8px;">
            <option>AI-optimal (recommended)</option>
            <option>Even distribution</option>
            <option>Custom schedule</option>
          </select>
        </p>
        <p style="margin-top: 14px;"><strong>Approval gate:</strong>
          <select class="input" style="display:inline-block; width: 200px; margin-left: 8px;">
            <option>Require approval per post</option>
            <option>Auto-publish if voice ≥ 0.90</option>
            <option>Auto-publish all</option>
          </select>
        </p>
        <p style="color: var(--text-dim); font-size: 12px; margin-top: 14px;">Estimated time to schedule: <strong>~12 seconds</strong>. Copy generation runs in parallel.</p>
      `,
      primary: { label: 'Auto-schedule →', value: 'go' },
      secondary: { label: 'Cancel' }
    }).then(r => {
      if (r === 'go') {
        runScheduling(count);
      }
    });
  }

  function runScheduling(count) {
    const toastDismiss = maestroToast(`Placing ${count} posts...`, { kind: 'agent', title: 'Maestro', duration: 8000 });
    setTimeout(() => {
      maestroToast(`Generating ${count} caption sets...`, { kind: 'agent', title: 'Maestro', duration: 3000 });
    }, 1800);
    setTimeout(() => {
      maestroToast(`${count} posts scheduled · awaiting your approval in the Publishing Queue`, { kind: 'success', title: 'Done', duration: 4000 });
      // Mark all selected tiles as "used"
      document.querySelectorAll('.lib-tile.selected').forEach(t => {
        t.classList.remove('selected');
        const badges = t.querySelector('.tile-badges');
        if (badges && !badges.querySelector('.src-badge.used')) {
          const used = document.createElement('span');
          used.className = 'src-badge used';
          used.textContent = 'Scheduled';
          badges.appendChild(used);
        }
        t.dataset.used = 'yes';
      });
      selected.clear();
      updateBulkBar();
    }, 4200);
    setTimeout(() => {
      // Offer to navigate to Publishing Queue
      maestroModal({
        title: 'Scheduling complete',
        body: `<p><strong>${count} posts</strong> placed across your selected channels over the chosen window.</p><p>Captions auto-generated in your brand voice · all in the Publishing Queue awaiting approval.</p>`,
        primary: { label: 'Open Publishing Queue', value: 'go' },
        secondary: { label: 'Stay here' }
      }).then(r => { if (r === 'go') location.href = 'schedule.html'; });
    }, 5400);
  }
})();
