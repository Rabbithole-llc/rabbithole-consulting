// Creative Studio page controller.
(function () {
  const H = MaestroHelpers;

  // Pre-baked variant sets — each set is 4 Magdalena photos for the "regenerate" cycle.
  const VARIANT_SETS = [
    [ // The Studio + morning
      'assets/photos/magdalena-bedroom-tray.jpg',
      'assets/photos/magdalena-curtains-window.jpg',
      'assets/photos/magdalena-studio-room.jpg',
      'assets/photos/magdalena-armchair.jpg',
    ],
    [ // Rooftop + sunset
      'assets/photos/magdalena-rooftop-sunset.jpg',
      'assets/photos/magdalena-couple-sunset.jpg',
      'assets/photos/magdalena-rooftop-lounge.jpg',
      'assets/photos/magdalena-exterior.jpg',
    ],
    [ // Suites + interiors
      'assets/photos/magdalena-junior-suite.jpg',
      'assets/photos/magdalena-two-bedroom.jpg',
      'assets/photos/magdalena-room-waiting.jpg',
      'assets/photos/magdalena-lobby.jpg',
    ],
    [ // Hospitality details
      'assets/photos/magdalena-breakfast.jpg',
      'assets/photos/magdalena-business-desk.jpg',
      'assets/photos/magdalena-crafted-for-curious.jpg',
      'assets/photos/magdalena-bedroom-tray.jpg',
    ],
  ];

  function currentSetIndex() {
    return MaestroState.get().creativeVariants % VARIANT_SETS.length;
  }

  function applyVariantSet(setIndex) {
    const set = VARIANT_SETS[setIndex % VARIANT_SETS.length];
    const tiles = document.querySelectorAll('.gen-media');
    // Only target the 4 main result tiles (not library).
    [...tiles].slice(0, 4).forEach((tile, i) => {
      tile.style.background = '';
      tile.style.backgroundImage = `url('${set[i]}')`;
      tile.style.backgroundSize = 'cover';
      tile.style.backgroundPosition = 'center';
      tile.classList.add('fade-in');
      setTimeout(() => tile.classList.remove('fade-in'), 400);
    });
    const label = document.querySelector('.text-xs[style*="text-dim"]');
    if (label && label.textContent.includes('Generation')) {
      const num = MaestroState.get().generations + 1;
      MaestroState.update(s => { s.generations = num; });
      label.textContent = `Generation #${num.toLocaleString()} · "sunday morning courtyard..." · 38s`;
    }
  }

  // Generate button.
  H.bind(H.btnContains('Generate 4 images'), (e, btn) => {
    const tiles = [...document.querySelectorAll('.gen-media')].slice(0, 4);
    // Show skeleton state.
    tiles.forEach(t => { t.dataset.savedBg = t.style.background; t.style.background = 'var(--surface-2)'; t.classList.add('skeleton'); });
    H.runAgent(btn, {
      label: 'Generating...',
      durationMs: 2400,
      toastMsg: 'Generating 4 variants...',
      onDone: () => {
        tiles.forEach(t => { t.classList.remove('skeleton'); });
        MaestroState.update(s => { s.creativeVariants += 1; });
        applyVariantSet(currentSetIndex());
        maestroToast('4 images generated · all on-brand', { kind: 'success', title: 'Maestro' });
      }
    });
  });

  H.bind(H.btnByText('Regenerate all'), (e, btn) => {
    H.runAgent(btn, {
      label: 'Regenerating...',
      durationMs: 1800,
      onDone: () => {
        MaestroState.update(s => { s.creativeVariants += 1; });
        applyVariantSet(currentSetIndex());
        maestroToast('4 new variants generated', { kind: 'success', title: 'Maestro' });
      }
    });
  });

  // Action chips for variant manipulation.
  H.bind(H.btnContains('More like Variant 3'), (e, btn) => {
    H.runAgent(btn, {
      label: 'Generating similar...',
      durationMs: 1600,
      onDone: () => {
        MaestroState.update(s => { s.creativeVariants += 1; });
        applyVariantSet(currentSetIndex());
        maestroToast('4 more variants in this style', { kind: 'success' });
      }
    });
  });
  H.bind(H.btnContains('different angle'), (e, btn) => {
    H.runAgent(btn, {
      label: 'Trying different angle...',
      durationMs: 1700,
      onDone: () => {
        MaestroState.update(s => { s.creativeVariants += 1; });
        applyVariantSet(currentSetIndex());
        maestroToast('Different angle generated', { kind: 'success' });
      }
    });
  });
  H.bind(H.btnContains('Replace background'), (e, btn) => {
    H.runAgent(btn, {
      label: 'Replacing background...',
      durationMs: 2000,
      onDone: () => {
        MaestroState.update(s => { s.creativeVariants += 1; });
        applyVariantSet(currentSetIndex());
        maestroToast('Background replaced · 4 new variants', { kind: 'success' });
      }
    });
  });
  H.bind(H.btnContains('Tighten the crop'), (e, btn) => {
    H.runAgent(btn, {
      label: 'Tightening crop...',
      durationMs: 1400,
      onDone: () => {
        maestroToast('Crop tightened on all 4 variants', { kind: 'success' });
      }
    });
  });

  // Suggestion clicks → fill textarea.
  document.querySelectorAll('.card .space-y-2.mt-3 > div').forEach(s => {
    s.addEventListener('click', () => {
      const ta = document.querySelector('textarea.input');
      if (ta) {
        ta.value = s.textContent.trim().replace(/^"/, '').replace(/"$/, '');
        ta.focus();
        maestroToast('Prompt loaded', { kind: 'info', duration: 1400 });
      }
    });
    s.style.cursor = 'pointer';
  });

  // Save selected button.
  H.bind(H.btnContains('Save selected to library'), () => {
    maestroToast('3 selected creatives saved to library', { kind: 'success' });
  });

  // Asset library / Recent generations header buttons.
  H.bind(H.btnByText('Asset library'), () => {
    document.querySelector('h2, .page-title')?.scrollIntoView({ behavior: 'smooth' });
    document.querySelectorAll('.page-title').forEach(t => {
      if (t.textContent.includes('Asset Library')) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  H.bind(H.btnByText('Recent generations'), () => {
    maestroToast('Last 50 generations · all preserved with prompt + cost', { kind: 'info' });
  });

  // Library tiles → toast on click.
  document.querySelectorAll('.lib-media').forEach(t => {
    t.addEventListener('click', () => maestroToast('Asset added to current post', { kind: 'success', duration: 1500 }));
  });

  // Save / "+" actions on gen-media tiles.
  document.querySelectorAll('.gen-media .gen-action').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const title = a.getAttribute('title') || 'Action';
      maestroToast(`${title} · applied`, { kind: 'success', duration: 1500 });
    });
  });

  // Filter / Library search input.
  document.querySelectorAll('input.input').forEach(inp => {
    if (inp.placeholder && inp.placeholder.toLowerCase().includes('search')) {
      inp.addEventListener('input', () => {
        // Visual filter: dim tiles that don't match the search text.
        const q = inp.value.toLowerCase().trim();
        document.querySelectorAll('.lib-media').forEach((t, i) => {
          if (!q) { t.style.opacity = ''; return; }
          // Pseudo-match by index parity for demo feel.
          t.style.opacity = (i % 2 === 0) === (q.length % 2 === 0) ? '1' : '0.25';
        });
      });
    }
  });

  // Filter button below library.
  H.bind(H.btnByText('Filter'), () => {
    maestroToast('Filter by tags, color, channel, or date', { kind: 'info' });
  });

})();
