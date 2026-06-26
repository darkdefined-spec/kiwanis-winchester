(function () {
  function normalizePath(pathname) {
    if (!pathname || pathname === '/') return '/';
    return pathname.endsWith('/') ? pathname : `${pathname}/`;
  }

  function textWithPreservedEdges(node, value) {
    const original = node.nodeValue || '';
    const leading = original.match(/^\s*/)?.[0] || '';
    const trailing = original.match(/\s*$/)?.[0] || '';
    node.nodeValue = `${leading}${value}${trailing}`;
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
      element.setAttribute('src', entry.value);
      if (entry.alt) element.setAttribute('alt', entry.alt);
      return;
    }

    if (entry.kind === 'backgroundImage') {
      element.style.setProperty(entry.property || '--page-hero-image', `url('${entry.value}')`);
    }
  }

  function applySiteEdits() {
    const dataElement = document.getElementById('site-edits-data');
    if (!dataElement) return;
    let edits = null;
    try {
      edits = JSON.parse(dataElement.textContent || '{}');
    } catch (_error) {
      return;
    }
    const path = normalizePath(window.location.pathname);
    const entries = edits.entries || edits.pages?.[path] || [];
    entries.forEach(applyEntry);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySiteEdits);
  } else {
    applySiteEdits();
  }
})();
