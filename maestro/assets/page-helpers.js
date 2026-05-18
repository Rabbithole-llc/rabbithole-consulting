// Page-controller helpers shared across pages.
// Loaded implicitly by each page-<key>.js via this file pattern.
window.MaestroHelpers = window.MaestroHelpers || (function () {

  // Find buttons by exact text match (trimmed).
  function btnByText(text, scope = document) {
    return [...scope.querySelectorAll('button, a.btn')].filter(b =>
      b.textContent.replace(/\s+/g, ' ').trim() === text
    );
  }

  // Find buttons whose text starts with a given prefix.
  function btnStartsWith(prefix, scope = document) {
    return [...scope.querySelectorAll('button, a.btn')].filter(b =>
      b.textContent.replace(/\s+/g, ' ').trim().startsWith(prefix)
    );
  }

  // Find buttons whose text contains a substring.
  function btnContains(substr, scope = document) {
    return [...scope.querySelectorAll('button, a.btn')].filter(b =>
      b.textContent.replace(/\s+/g, ' ').trim().includes(substr)
    );
  }

  // Bind a click handler to every element returned by a finder.
  function bind(els, handler) {
    els.forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handler(e, el);
      });
    });
  }

  // Replace all of a button's children temporarily with a spinner+label.
  function setBusy(btn, label = 'Working...') {
    if (btn.dataset.busy) return null;
    btn.dataset.busy = '1';
    btn.dataset.originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.innerHTML = `<span class="spinner" style="vertical-align:middle;"></span> ${label}`;
    return () => {
      btn.innerHTML = btn.dataset.originalHtml;
      delete btn.dataset.originalHtml;
      delete btn.dataset.busy;
      btn.disabled = false;
      btn.style.opacity = '';
    };
  }

  // Run a fake-async flow with a busy state on a button.
  function runAgent(btn, { label = 'Generating...', durationMs = 1700, onDone, toast = true, toastMsg }) {
    const restore = setBusy(btn, label);
    if (toast) {
      maestroToast(toastMsg || label, { kind: 'agent', title: 'Maestro', duration: durationMs + 400 });
    }
    setTimeout(() => {
      if (restore) restore();
      try { onDone && onDone(); } catch (e) { console.error(e); }
    }, durationMs);
  }

  // Pick the next item from an array, cycling.
  function cycle(arr, index) {
    return arr[index % arr.length];
  }

  return { btnByText, btnStartsWith, btnContains, bind, setBusy, runAgent, cycle };
})();
