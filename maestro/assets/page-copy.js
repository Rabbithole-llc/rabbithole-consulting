// Copy Editor page controller.
(function () {
  const H = MaestroHelpers;

  // Pre-baked alternate copy variants per channel for the "Regenerate" cycle.
  const COPY_VARIANTS = {
    instagram: [
      `Your morning, unhurried.\n\nThe Studio. Wood, stone, soft light, the kind of bed you don't want to leave. Complimentary breakfast brought up on a wooden tray if you'd rather not move yet.\n\nMagdalena 1163 — Condado, San Juan. From $249/night.\nBook direct → magdalena1163.com`,
      `Begin the day your way.\n\nComplimentary robes, Byredo amenities, and a view of Condado from the curtain pull. The kind of room you book once and return to.\n\n→ magdalena1163.com`,
      `Crafted for the Curious.\n\nA boutique hotel in the heart of Condado — 10 suites, a rooftop, and the part of San Juan most travelers miss.\n\nBook your stay → magdalena1163.com`,
    ],
    tiktok: [
      `pov: you wake up in condado and your morning is yours ☀️\n\nthe studio at magdalena 1163. from $249.\n\nbook direct ↓ magdalena1163.com`,
      `evenings are better up here 🌇\n\nrooftop lounge at magdalena. condado, san juan.\n\n↓ magdalena1163.com`,
      `crafted for the curious.\n\nbusiness class. boutique soul. conference center + rooftop + 10 suites in the heart of condado.\n\n↓ magdalena1163.com`,
    ],
    facebook: [
      `Evenings are better up here.\n\nThe Rooftop Lounge at Magdalena 1163 — striped banquettes, candlelight, and a sunset over Condado that doesn't ask you to do anything in particular.\n\nOpen to guests and reservations. magdalena1163.com`,
      `New to Condado.\n\nA boutique hotel crafted for the curious — Studios from $249, Junior Suites, and a Two-Bedroom for the ones who travel together. Conference center for the work stays, rooftop for the rest.\n\nDiscover & book → magdalena1163.com`,
    ],
    linkedin: [
      `In hospitality we talk a lot about "the guest experience" — which is a phrase I've grown to dislike, because experiences are advertised. They're not noticed.\n\nWhat I think actually matters is the unscripted moment. The complimentary robe waiting at the door. The breakfast brought up without being asked. The conference room that doesn't feel like one.\n\nWe built Magdalena 1163 around the unscripted parts. It's harder to scale. It's also the only thing that lasts.`,
      // Fixed version (no "guest experience"):
      `Most boutique hotels pick a side. They're either for the leisure traveler or for the business traveler. The two segments don't share a hotel — until they do.\n\nMagdalena 1163 was designed for both. Conference center, high-speed wifi, room service for the work stay. Rooftop, Byredo amenities, breakfast on a tray for the weekend that follows.\n\nBusiness class. Boutique soul. Condado, San Juan.`,
      `If you're flying into San Juan for a board meeting and staying for a long weekend, here's the case for booking us:\n\nThe conference center is on-site. The desk in the room actually works. The rooftop opens at 5. The breakfast is included. The Junior Suite has a kitchen if you need one.\n\nNo branding overhead, no chain dynamics. Just Magdalena 1163, Condado, the way we built it.`,
    ],
  };

  function findChannelCard(name) {
    return [...document.querySelectorAll('.channel-card')].find(card => {
      return card.querySelector('.channel-name')?.textContent.trim() === name;
    });
  }

  function cycleChannel(channelKey, displayName) {
    const card = findChannelCard(displayName);
    if (!card) return;
    MaestroState.update(s => { s.copyVariants[channelKey] = (s.copyVariants[channelKey] + 1) % COPY_VARIANTS[channelKey].length; });
    const variant = COPY_VARIANTS[channelKey][MaestroState.get().copyVariants[channelKey]];
    const area = card.querySelector('.copy-area');
    if (area) {
      area.style.transition = 'opacity .25s';
      area.style.opacity = '0';
      setTimeout(() => {
        area.textContent = variant;
        area.style.opacity = '1';
        area.classList.add('fade-in');
        setTimeout(() => area.classList.remove('fade-in'), 400);
      }, 250);
    }
    return card;
  }

  // Per-card Regenerate buttons.
  document.querySelectorAll('.channel-card').forEach(card => {
    const name = card.querySelector('.channel-name')?.textContent.trim();
    const key = name?.toLowerCase();
    if (!COPY_VARIANTS[key]) return;
    const regen = [...card.querySelectorAll('button')].find(b => b.textContent.trim() === 'Regenerate');
    if (regen) {
      regen.addEventListener('click', (e) => {
        e.preventDefault();
        H.runAgent(regen, {
          label: 'Regenerating...',
          durationMs: 1500,
          toastMsg: `Regenerating ${name} variant`,
          onDone: () => {
            cycleChannel(key, name);
            maestroToast(`New ${name} variant generated`, { kind: 'success' });
          }
        });
      });
    }
    const regenHook = [...card.querySelectorAll('button')].find(b => b.textContent.trim() === 'Regen hook');
    if (regenHook) {
      regenHook.addEventListener('click', (e) => {
        e.preventDefault();
        H.runAgent(regenHook, {
          label: 'Regenerating hook...',
          durationMs: 1200,
          onDone: () => {
            cycleChannel(key, name);
            maestroToast('Hook regenerated', { kind: 'success' });
          }
        });
      });
    }
    const edit = [...card.querySelectorAll('button')].find(b => b.textContent.trim() === 'Edit');
    if (edit) {
      edit.addEventListener('click', (e) => {
        e.preventDefault();
        const area = card.querySelector('.copy-area');
        if (area) {
          if (area.getAttribute('contenteditable') === 'true') {
            area.setAttribute('contenteditable', 'false');
            area.style.outline = '';
            edit.textContent = 'Edit';
            maestroToast('Edits saved', { kind: 'success' });
          } else {
            area.setAttribute('contenteditable', 'true');
            area.style.outline = '2px solid var(--accent)';
            area.focus();
            edit.textContent = 'Done';
            maestroToast('Editing inline', { kind: 'info' });
          }
        }
      });
    }
  });

  // LinkedIn fix-it suggestion button (Want a regen?)
  document.querySelectorAll('.card').forEach(c => {
    if (c.textContent.includes('Voice match below 0.85')) {
      // No explicit button — make the whole alert clickable.
      c.style.cursor = 'pointer';
      c.addEventListener('click', () => {
        // Force LinkedIn to variant index 1 (the fixed version).
        MaestroState.update(s => { s.copyVariants.linkedin = 1; });
        const card = findChannelCard('LinkedIn');
        if (card) {
          const area = card.querySelector('.copy-area');
          if (area) {
            area.style.transition = 'opacity .25s';
            area.style.opacity = '0';
            setTimeout(() => {
              area.textContent = COPY_VARIANTS.linkedin[1];
              area.style.opacity = '1';
            }, 250);
          }
          // Update voice match badge.
          const badge = card.querySelector('.badge-warn');
          if (badge) {
            badge.className = 'badge badge-success';
            badge.textContent = '0.93';
          }
        }
        c.style.transition = 'opacity .3s';
        c.style.opacity = '0';
        setTimeout(() => c.style.display = 'none', 320);
        maestroToast('LinkedIn copy regenerated · banned phrase removed', { kind: 'success', title: 'Maestro' });
      });
    }
  });

  // Header buttons.
  H.bind(H.btnByText('Brief'), () => location.href = 'calendar.html');
  H.bind(H.btnByText('Regenerate all'), (e, btn) => {
    H.runAgent(btn, {
      label: 'Regenerating all 4 variants...',
      durationMs: 2400,
      toastMsg: 'Regenerating all platform variants',
      onDone: () => {
        ['instagram', 'tiktok', 'facebook', 'linkedin'].forEach(k => {
          const display = k.charAt(0).toUpperCase() + k.slice(1);
          cycleChannel(k, display);
        });
        maestroToast('4 variants regenerated', { kind: 'success' });
      }
    });
  });

  H.bind(H.btnByText('Approve all'), (e, btn) => {
    H.runAgent(btn, {
      label: 'Approving...',
      durationMs: 900,
      onDone: () => {
        maestroToast('All 4 variants approved → sent to publishing queue', { kind: 'success', title: 'Scheduled' });
        setTimeout(() => location.href = 'schedule.html', 700);
      }
    });
  });

  H.bind(H.btnByText('Approve all → Schedule'), (e, btn) => {
    H.runAgent(btn, {
      label: 'Approving...',
      durationMs: 900,
      onDone: () => {
        maestroToast('Sent to publishing queue', { kind: 'success' });
        setTimeout(() => location.href = 'schedule.html', 700);
      }
    });
  });

  H.bind(H.btnByText('Save as draft'), () => maestroToast('Saved as draft', { kind: 'success' }));
  H.bind(H.btnContains('Why these scores?'), () => {
    maestroModal({
      title: 'Voice match scoring',
      body: `
        <p>Voice match scores how closely a generated caption follows your Brand Context's voice rules — sentence rhythm, vocabulary, perspective, sensory specificity, and banned phrases.</p>
        <p>Each variant is graded 0.0–1.0. Above 0.85 is approval-ready. Below 0.85 the system surfaces a suggested fix (you saw this on the LinkedIn variant — it caught "guest experience" from your don't-say list).</p>
        <p>Brief alignment is a separate score that grades how well the copy delivers on the Maestro's brief (angle, format, CTA).</p>
      `,
      primary: { label: 'Got it', value: 'ok' }
    });
  });

})();
