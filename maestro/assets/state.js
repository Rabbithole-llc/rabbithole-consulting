// Maestro demo: shared application state in localStorage.
// Provides MaestroState global with get/set/update helpers and a tiny pub/sub
// so any page can react to state changes triggered by another page.

(function () {
  const KEY = 'maestro-demo-state-v1';

  const SEED = {
    posts: [
      { id: 'p1', title: 'Morning, unhurried', briefId: 'b1', channel: 'instagram', scheduledFor: 'Today · 7:30 AM', status: 'in_review', captionLead: '"Your morning, unhurried. The Studio. From $249/night..."', media: 'magdalena-bedroom-tray.jpg', approver: 'Pending Austin' },
      { id: 'p2', title: 'Business class, boutique soul', briefId: 'b2', channel: 'linkedin', scheduledFor: 'Today · 11:00 AM', status: 'in_review', captionLead: '"Conference center, high-speed wifi, room service — book your work stay..."', media: 'magdalena-business-desk.jpg', approver: 'Pending Austin' },
      { id: 'p3', title: 'Crafted for the Curious', briefId: 'b3', channel: 'tiktok', scheduledFor: 'Today · 2:15 PM', status: 'scheduled', captionLead: '"Crafted for the curious. A boutique hotel in the heart of Condado..."', media: 'magdalena-crafted-for-curious.jpg', approver: 'Austin · 6 min ago' },
      { id: 'p4', title: 'The Junior Suite', briefId: 'b4', channel: 'instagram', scheduledFor: 'Today · 6:00 PM', status: 'in_review', captionLead: '"The Junior Suite. Spacious. Indulgent. Perfectly composed..."', media: 'magdalena-junior-suite.jpg', approver: 'Pending Juan' },
      { id: 'p5', title: 'Breakfast the way the island intended', briefId: 'b5', channel: 'facebook', scheduledFor: 'May 7 · 7:00 PM', status: 'failed', captionLead: '"Complimentary breakfast — fresh, local, slow..."', media: 'magdalena-breakfast.jpg', approver: 'Auto-approved' },
      { id: 'p6', title: 'Evenings are better up here', briefId: 'b6', channel: 'instagram', scheduledFor: 'Tomorrow · 7:00 AM', status: 'scheduled', captionLead: '"Rooftop Lounge at sunset. Condado, San Juan..."', media: 'magdalena-rooftop-sunset.jpg', approver: 'Juan · 2h ago' },
      { id: 'p7', title: 'Arrival is part of the experience', briefId: 'b7', channel: 'linkedin', scheduledFor: 'May 18 · 9:00 AM', status: 'scheduled', captionLead: '"The lobby, the art, the first quiet moment. Book direct..."', media: 'magdalena-lobby.jpg', approver: 'Auto-approved · ≥0.90 voice' },
      { id: 'p8', title: 'An escape for two', briefId: 'b8', channel: 'tiktok', scheduledFor: 'May 5 · 5:00 PM', status: 'published', captionLead: '"Where the city meets the sunset. Condado..."', media: 'magdalena-couple-sunset.jpg', approver: '2.1K views · 184 likes' },
    ],
    brandContext: {
      version: 12,
      doSay: ['"Crafted for the Curious"', '"Stay where curiosity lives"', '"the heart of Condado"', 'rooftop lounge references', 'Byredo amenities · complimentary robes', 'business + boutique positioning'],
      dontSay: ['"Casa Magdalena" (canonical is "Magdalena 1163")', '"luxury," "elevate," "experience" as noun', '"paradise," "hidden gem," "tropical escape"', 'all-inclusive language', 'competitor names', 'superlatives ("best," "most beautiful")'],
      suggestionDismissed: false,
    },
    filters: {
      calendarChannels: { instagram: true, tiktok: true, facebook: true, linkedin: true },
      calendarView: 'month',
      scheduleStatus: 'all',
      scheduleSearch: '',
      adsChannel: 'all',
      analyticsRange: '30d',
      analyticsMetric: 'revenue',
    },
    generations: 2847,
    creativeVariants: 0, // increments to cycle through gradient sets
    copyVariants: { instagram: 0, tiktok: 0, facebook: 0, linkedin: 0 },
    approvalRule: 'all',
    flags: {},
  };

  let cache = null;

  function load() {
    if (cache) return cache;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        cache = JSON.parse(raw);
        // shallow merge missing top-level keys from SEED for forward-compat
        for (const k of Object.keys(SEED)) {
          if (cache[k] === undefined) cache[k] = JSON.parse(JSON.stringify(SEED[k]));
        }
      } else {
        cache = JSON.parse(JSON.stringify(SEED));
        save();
      }
    } catch (e) {
      cache = JSON.parse(JSON.stringify(SEED));
    }
    return cache;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) {}
    notify();
  }

  const listeners = new Set();
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function notify() { listeners.forEach(fn => { try { fn(cache); } catch (e) {} }); }

  function get() { return load(); }
  function update(mutator) {
    const s = load();
    mutator(s);
    save();
    return s;
  }

  function reset() {
    cache = JSON.parse(JSON.stringify(SEED));
    save();
  }

  function updatePost(id, patch) {
    update(s => {
      const p = s.posts.find(x => x.id === id);
      if (p) Object.assign(p, patch);
    });
  }

  function approvePost(id) {
    update(s => {
      const p = s.posts.find(x => x.id === id);
      if (p) {
        p.status = 'scheduled';
        p.approver = (s.currentUser || 'Austin') + ' · just now';
      }
    });
  }

  function approveAllAwaiting() {
    update(s => {
      s.posts.forEach(p => {
        if (p.status === 'in_review') {
          p.status = 'scheduled';
          p.approver = 'Bulk approved · just now';
        }
      });
    });
  }

  window.MaestroState = {
    get, update, save, subscribe, reset, updatePost, approvePost, approveAllAwaiting,
  };

  // Initialize on load.
  load();
})();
