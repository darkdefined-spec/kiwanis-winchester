(function () {
  const hasLiveRegion =
    document.querySelector('[data-live-events-list]') ||
    document.querySelector('[data-live-newsletters-list]') ||
    document.querySelector('[data-live-speakers-intro]') ||
    document.querySelector('[data-live-upcoming-speakers]') ||
    document.querySelector('[data-live-recent-speakers]');

  if (!hasLiveRegion) return;

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/'/g, '&#39;');
  }

  function sortedByDateDesc(items) {
    return [...(items || [])].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }

  function eventCard(event) {
    const photos = Array.isArray(event.photos) ? event.photos : [];
    return `
      <div class="event-card reveal visible" style="margin-bottom:24px;">
        <div class="event-card-header event-card-header--${escapeAttribute(event.headerColor || 'blue')}">
          <div>
            <span class="event-card-eyebrow">${escapeHtml(event.category)}</span>
            <h3 class="event-card-title">${escapeHtml(event.title)}</h3>
            <p class="event-card-meta">${escapeHtml(event.eventMeta)}</p>
          </div>
          ${event.facebookUrl ? `<a href="${escapeAttribute(event.facebookUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">More on Facebook</a>` : ''}
        </div>
        ${photos.length ? `
          <div class="event-card-photos event-card-photos--${photos.length}">
            ${photos.map((photo) => `
              <div class="event-photo">
                <img src="${escapeAttribute(photo.src)}" alt="${escapeAttribute(photo.alt)}" loading="lazy"${photo.objectPosition ? ` style="object-position:${escapeAttribute(photo.objectPosition)};"` : ''}>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  function groupNewsletters(items) {
    const byYear = {};
    sortedByDateDesc(items || []).forEach((item) => {
      const year = String(item.year || item.date || '').slice(0, 4) || 'Archive';
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(item);
    });
    return Object.entries(byYear).sort(([a], [b]) => Number(b) - Number(a));
  }

  function newsletterGroups(items) {
    return groupNewsletters(items).map(([year, newsletters], index) => `
      <div class="reveal visible" style="margin-bottom:40px;">
        <h3 style="font-size:1.1rem; color:var(--kw-navy); margin-bottom:16px; padding-bottom:10px; border-bottom:2px solid ${index === 0 ? 'var(--kw-gold)' : 'var(--kw-blue-light)'}; display:inline-block;">${escapeHtml(year)}</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:10px;">
          ${newsletters.map((item) => `
            <a href="${escapeAttribute(item.pdfUrl)}" target="_blank" rel="noopener noreferrer" class="nl-card">
              <div class="nl-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div>
                <p style="font-family:var(--font-display); font-weight:600; font-size:0.9rem; margin-bottom:2px;">${escapeHtml(item.title)}</p>
                <p style="font-size:0.78rem; color:var(--kw-muted);">PDF - Download</p>
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  function speakerCard(speaker) {
    const heading = speaker.name || speaker.topic || 'Guest speaker';
    return `
      <article style="background:white; border-radius:14px; padding:18px 20px; border:1px solid var(--kw-border);">
        <p style="font-size:0.78rem; color:var(--kw-blue); font-weight:800; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:5px;">${escapeHtml(speaker.date)}${speaker.meta ? ` - ${escapeHtml(speaker.meta)}` : ''}</p>
        <h4 style="font-size:1.02rem; color:var(--kw-navy); margin-bottom:4px;">${escapeHtml(heading)}</h4>
        ${speaker.organization || speaker.title ? `<p style="font-size:0.86rem; color:var(--kw-muted); margin-bottom:8px;">${escapeHtml(speaker.title)}${speaker.title && speaker.organization ? ', ' : ''}${escapeHtml(speaker.organization)}</p>` : ''}
        ${speaker.topic && speaker.name ? `<p style="font-weight:700; color:var(--kw-dark); margin-bottom:6px;">${escapeHtml(speaker.topic)}</p>` : ''}
        ${speaker.description ? `<p style="font-size:0.9rem; color:var(--kw-muted); line-height:1.6;">${escapeHtml(speaker.description)}</p>` : ''}
      </article>
    `;
  }

  function emptyUpcoming() {
    return `
      <div style="background:white; border-radius:14px; padding:20px 22px; border:1px solid var(--kw-border); display:flex; align-items:center; gap:16px;">
        <div><p style="font-weight:600; color:var(--kw-navy); margin-bottom:2px; font-size:0.95rem;">Speaker announcements coming soon</p><p style="font-size:0.85rem; color:var(--kw-muted);">Check back or join us Wednesday at noon</p></div>
      </div>
    `;
  }

  function emptyRecent() {
    return `
      <div style="background:white; border-radius:14px; padding:18px 22px; border:1px solid var(--kw-border);">
        <p style="font-size:0.875rem; color:var(--kw-muted); font-style:italic;">Past speaker information will be listed here as the club shares details.</p>
      </div>
    `;
  }

  function applyLiveContent(content) {
    const eventsList = document.querySelector('[data-live-events-list]');
    if (eventsList) eventsList.innerHTML = sortedByDateDesc(content.events || []).map(eventCard).join('');

    const newslettersList = document.querySelector('[data-live-newsletters-list]');
    if (newslettersList) newslettersList.innerHTML = newsletterGroups(content.newsletters || []);

    const speakers = content.speakers || {};
    const intro = document.querySelector('[data-live-speakers-intro]');
    if (intro) intro.textContent = speakers.intro || '';

    const upcoming = document.querySelector('[data-live-upcoming-speakers]');
    if (upcoming) {
      const items = sortedByDateDesc(speakers.upcoming || []);
      upcoming.innerHTML = items.length ? items.map(speakerCard).join('') : emptyUpcoming();
    }

    const recent = document.querySelector('[data-live-recent-speakers]');
    if (recent) {
      const items = sortedByDateDesc(speakers.recent || []);
      recent.innerHTML = items.length ? items.map(speakerCard).join('') : emptyRecent();
    }
  }

  async function loadLiveContent() {
    const response = await fetch(`/api/editor-content?t=${Date.now()}`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Unable to load live editor content.');
    const payload = await response.json();
    if (payload.content) applyLiveContent(payload.content);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => loadLiveContent().catch(() => {}));
  } else {
    loadLiveContent().catch(() => {});
  }
})();
