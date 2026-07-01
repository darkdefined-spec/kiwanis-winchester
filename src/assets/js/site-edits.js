(function () {
  let liveEntries = [];
  let observerTimer = null;

  function normalizePath(pathname) {
    if (!pathname || pathname === '/') return '/';
    return pathname.endsWith('/') ? pathname : `${pathname}/`;
  }

  function textWithPreservedEdges(node, value) {
    const original = node.nodeValue || '';
    const leading = original.match(/^\s*/)?.[0] || '';
    const trailing = original.match(/\s*$/)?.[0] || '';
    const next = `${leading}${value}${trailing}`;
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function applyEntry(entry) {
    const element = document.querySelector(entry.selector);
    if (!element) return;

    if (entry.kind === 'text') {
      const node = element.childNodes[Number(entry.nodeIndex)];
      if (node && node.nodeType === Node.TEXT_NODE) textWithPreservedEdges(node, entry.value);
      return;
    }

    if (entry.kind === 'image') {
      if (element.getAttribute('src') !== entry.value) element.setAttribute('src', entry.value);
      if (entry.alt && element.getAttribute('alt') !== entry.alt) element.setAttribute('alt', entry.alt);
      return;
    }

    if (entry.kind === 'backgroundImage') {
      const property = entry.property || '--page-hero-image';
      const value = `url('${entry.value}')`;
      if (element.style.getPropertyValue(property) !== value) element.style.setProperty(property, value);
    }
  }

  function applyEntries(entries) {
    (Array.isArray(entries) ? entries : []).forEach(applyEntry);
  }

  function applyLiveEntries() {
    applyEntries(liveEntries);
  }

  function embeddedEntries() {
    const dataElement = document.getElementById('site-edits-data');
    if (!dataElement) return [];
    try {
      const edits = JSON.parse(dataElement.textContent || '{}');
      const path = normalizePath(window.location.pathname);
      return edits.entries || edits.pages?.[path] || [];
    } catch (_error) {
      return [];
    }
  }

  async function fetchLiveEntries() {
    const path = normalizePath(window.location.pathname);
    const response = await fetch(`/api/site-edits?path=${encodeURIComponent(path)}&t=${Date.now()}`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Unable to load live edits.');
    const payload = await response.json();
    return payload.entries || [];
  }

  function applySiteEdits() {
    applyEntries(embeddedEntries());
    fetchLiveEntries()
      .then((entries) => {
        liveEntries = entries;
        applyLiveEntries();
        const params = new URLSearchParams(window.location.search);
        if (params.has('adminPreview')) return;
        setTimeout(applyLiveEntries, 80);
        setTimeout(applyLiveEntries, 300);
        setTimeout(applyLiveEntries, 1000);
        setTimeout(applyLiveEntries, 2500);
        if (document.readyState !== 'complete') window.addEventListener('load', applyLiveEntries, { once: true });

        const observer = new MutationObserver(() => applyLiveEntries());
        observer.observe(document.body, {
          childList: true,
          characterData: true,
          subtree: true,
        });
        clearTimeout(observerTimer);
        observerTimer = setTimeout(() => observer.disconnect(), 8000);
      })
      .catch(() => {
        // The embedded build-time edits are already applied; live refresh is best-effort.
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySiteEdits);
  } else {
    applySiteEdits();
  }
})();
