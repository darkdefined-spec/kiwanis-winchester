(function () {
  const SESSION_KEY = 'kiwanis_admin_session';
  const state = {
    challenge: '',
    email: '',
    token: localStorage.getItem(SESSION_KEY) || '',
    files: [],
    entries: new Map(),
    drafts: new Map(),
    activeId: '',
    selected: null,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const params = new URLSearchParams(window.location.search);
  const IS_LOCAL_HOST = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
  const IS_TEST_LOGIN = IS_LOCAL_HOST && (params.has('adminTest') || params.has('demo'));

  function setStatus(message, isError) {
    const authStatus = $('#auth-status');
    const saveStatus = $('#save-status');
    if (authStatus && !$('#login-panel').classList.contains('hidden')) authStatus.textContent = message || '';
    if (saveStatus && !$('#admin-app').classList.contains('hidden')) {
      saveStatus.textContent = message || 'Stage changes as a draft, then publish when all page edits are ready.';
    }
    if (authStatus) authStatus.style.color = isError ? '#b42318' : '';
    if (saveStatus) saveStatus.style.color = isError ? '#b42318' : '';
  }

  function setDemoLoginCopy() {
    if (!IS_TEST_LOGIN) return;
    const emailHint = $('#admin-email-hint');
    const codeHint = $('#admin-code-hint');
    if (emailHint) emailHint.textContent = 'Demo mode: enter any email address. No real login email will be sent.';
    if (codeHint) codeHint.textContent = 'Demo mode: enter any fake six-digit code, such as 123456.';
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizePath(pathname) {
    if (!pathname || pathname === '/') return '/';
    return pathname.endsWith('/') ? pathname : `${pathname}/`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function labelize(value) {
    return String(value || '')
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim();
  }

  function activeEntry() {
    return state.entries.get(state.activeId);
  }

  function contentFor(fileId) {
    const entry = state.entries.get(fileId);
    if (!entry) return {};
    return state.drafts.get(fileId) || entry.content || {};
  }

  function getByPath(object, path) {
    return path.reduce((cursor, key) => (cursor && typeof cursor === 'object' ? cursor[key] : undefined), object);
  }

  function setByPath(target, path, value) {
    let cursor = target;
    path.slice(0, -1).forEach((key) => {
      if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
      cursor = cursor[key];
    });
    cursor[path[path.length - 1]] = value;
  }

  function stageValue(fileId, path, value) {
    const draft = clone(contentFor(fileId));
    setByPath(draft, path, value);
    state.drafts.set(fileId, draft);
    if (fileId === state.activeId) renderActiveFile({ keepPreview: true });
    updateDraftSummary();
  }

  function siteEditsContent() {
    return contentFor('siteEdits');
  }

  function siteEditEntriesForPath(path) {
    return siteEditsContent().pages?.[normalizePath(path)] || [];
  }

  function stageSiteEdit(pagePath, editId, value) {
    const draft = clone(siteEditsContent());
    const path = normalizePath(pagePath);
    const entries = draft.pages?.[path] || [];
    const entry = entries.find((item) => item.id === editId);
    if (!entry) return;
    entry.value = value;
    state.drafts.set('siteEdits', draft);
    updateDraftSummary();
  }

  async function api(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const response = await fetch(path, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
    return payload;
  }

  function showApp() {
    $('#login-panel').classList.add('hidden');
    $('#admin-app').classList.remove('hidden');
  }

  function showLogin() {
    $('#admin-app').classList.add('hidden');
    $('#login-panel').classList.remove('hidden');
  }

  function shouldUseTextarea(path, value) {
    const key = path.join('.').toLowerCase();
    return String(value || '').length > 90 || /body|intro|lede|subtitle|description|note|banner/.test(key);
  }

  function inputType(path, value) {
    const key = path.join('.').toLowerCase();
    if (/email/.test(key)) return 'email';
    if (/url|facebook/.test(key) || String(value || '').startsWith('http')) return 'url';
    return 'text';
  }

  function renderValue(path, value) {
    const pathValue = escapeHtml(path.join('.'));
    const label = escapeHtml(labelize(path[path.length - 1]));
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return `
        <section class="admin-group">
          <div class="admin-group-head">
            <h3>${label}</h3>
            <small>${escapeHtml(path.join('.'))}</small>
          </div>
          <div class="admin-field-grid">
            ${Object.entries(value).map(([key, child]) => renderValue([...path, key], child)).join('')}
          </div>
        </section>
      `;
    }

    if (Array.isArray(value)) {
      return `
        <label class="field full admin-json-field">
          <span>${label}</span>
          <textarea data-field-path="${pathValue}" data-json="true" rows="8">${escapeHtml(JSON.stringify(value, null, 2))}</textarea>
        </label>
      `;
    }

    if (shouldUseTextarea(path, value)) {
      return `
        <label class="field full">
          <span>${label}</span>
          <textarea data-field-path="${pathValue}" rows="4">${escapeHtml(value)}</textarea>
        </label>
      `;
    }

    return `
      <label class="field">
        <span>${label}</span>
        <input type="${inputType(path, value)}" data-field-path="${pathValue}" value="${escapeHtml(value)}">
      </label>
    `;
  }

  function renderTabs() {
    $('#admin-tabs').innerHTML = state.files.map((file) => {
      const staged = state.drafts.has(file.id) ? ' *' : '';
      return `
        <button class="tab-button${file.id === state.activeId ? ' active' : ''}" type="button" data-file-id="${escapeHtml(file.id)}">
          ${escapeHtml(file.label + staged)}
        </button>
      `;
    }).join('');
  }

  function renderHistory(history) {
    const list = $('#history-list');
    if (!history || !history.length) {
      list.innerHTML = '<p class="hint">No recent saves found yet.</p>';
      return;
    }
    const canRestore = !(IS_TEST_LOGIN && state.token === 'test-admin');
    list.innerHTML = history.map((commit) => `
      <div class="history-row">
        <div>
          <strong>${escapeHtml(commit.message || 'Admin update')}</strong>
          <small>${escapeHtml(commit.date || '')} by ${escapeHtml(commit.author || 'Unknown')}</small>
        </div>
        <div class="history-actions">
          ${commit.url ? `<a href="${escapeHtml(commit.url)}" target="_blank" rel="noopener">View</a>` : ''}
          ${canRestore && commit.sha ? `<button type="button" class="history-restore" data-restore-sha="${escapeHtml(commit.sha)}">Restore</button>` : ''}
        </div>
      </div>
    `).join('');
  }

  function previewUrl(entry) {
    const url = new URL(entry.previewPath || '/', window.location.origin);
    url.searchParams.set('adminPreview', '1');
    return url.pathname + url.search;
  }

  function renderActiveFile(options = {}) {
    const entry = activeEntry();
    if (!entry) return;
    const content = contentFor(entry.id);
    $('#active-file-label').textContent = entry.label;
    $('#active-file-path').textContent = entry.path;
    $('#preview-link').href = entry.previewPath || '/';
    $('#admin-fields').innerHTML = Object.entries(content || {})
      .map(([key, value]) => renderValue([key], value))
      .join('');
    renderTabs();
    renderHistory(entry.history || []);
    updateDraftSummary();
    if (!options.keepPreview) loadPreview(entry);
  }

  function loadPreview(entry) {
    const iframe = $('#live-preview');
    iframe.src = previewUrl(entry);
  }

  function flattenContent(fileId, value = contentFor(fileId), path = []) {
    const rows = [];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.entries(value).forEach(([key, child]) => {
        rows.push(...flattenContent(fileId, child, [...path, key]));
      });
      return rows;
    }
    if (Array.isArray(value)) return rows;
    if (value === null || value === undefined || value === '') return rows;
    rows.push({
      fileId,
      path,
      pathText: path.join('.'),
      value: String(value),
      label: `${state.entries.get(fileId)?.label || fileId}: ${path.map(labelize).join(' / ')}`,
    });
    return rows;
  }

  function allEditableValues() {
    return state.files.flatMap((file) => flattenContent(file.id));
  }

  function pathMatchesAsset(value, candidate) {
    const cleanValue = String(value || '').replace(/^https?:\/\/[^/]+/, '');
    const cleanCandidate = String(candidate || '').replace(/^https?:\/\/[^/]+/, '');
    return cleanValue && cleanCandidate && cleanValue === cleanCandidate;
  }

  function isVisiblePreviewElement(element) {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const view = element.ownerDocument.defaultView;
    if (rect.right < 0 || rect.bottom < 0 || rect.left > view.innerWidth || rect.top > view.innerHeight) return false;
    const styles = element.ownerDocument.defaultView.getComputedStyle(element);
    return styles.display !== 'none' && styles.visibility !== 'hidden' && styles.opacity !== '0';
  }

  function matchElement(element, values) {
    if (element.dataset.adminFile && element.dataset.adminPath) return null;
    if (!isVisiblePreviewElement(element)) return null;

    const tag = element.tagName.toLowerCase();
    if (tag === 'img') {
      if (element.classList.contains('hero-bg-img')) return null;
      const src = element.getAttribute('src') || '';
      return values.find((item) => pathMatchesAsset(item.value, src));
    }

    const style = element.getAttribute('style') || '';
    if (style.includes('url(')) {
      const urlMatch = style.match(/url\(['"]?([^'")]+)['"]?\)/);
      if (urlMatch) return values.find((item) => pathMatchesAsset(item.value, urlMatch[1]));
    }

    const text = normalizeText(element.textContent);
    if (!text || text.length > 500) return null;
    return values.find((item) => normalizeText(item.value) === text);
  }

  function decoratePreview() {
    const iframe = $('#live-preview');
    const doc = iframe.contentDocument;
    if (!doc) return;

    const pagePath = normalizePath(iframe.contentWindow.location.pathname);
    const siteEntries = siteEditEntriesForPath(pagePath);
    const values = allEditableValues();
    doc.querySelectorAll('[data-admin-wrapped-text="true"]').forEach((wrapper) => {
      const text = doc.createTextNode(wrapper.textContent || '');
      wrapper.replaceWith(text);
    });
    doc.querySelectorAll('.admin-live-editable').forEach((element) => {
      element.classList.remove('admin-live-editable', 'admin-live-selected');
      element.removeAttribute('data-admin-file');
      element.removeAttribute('data-admin-path');
      element.removeAttribute('data-admin-kind');
      element.removeAttribute('data-admin-site-edit-id');
      element.removeAttribute('data-admin-site-edit-page');
    });

    siteEntries.forEach((entry) => {
      const element = doc.querySelector(entry.selector);
      if (!element) return;

      if (entry.kind === 'text') {
        const node = element.childNodes[Number(entry.nodeIndex)];
        if (!node || node.nodeType !== Node.TEXT_NODE) return;
        const wrapper = doc.createElement('span');
        wrapper.textContent = node.nodeValue;
        wrapper.dataset.adminWrappedText = 'true';
        wrapper.dataset.adminSiteEditId = entry.id;
        wrapper.dataset.adminSiteEditPage = pagePath;
        wrapper.dataset.adminKind = 'text';
        wrapper.title = `Edit ${entry.label}`;
        wrapper.classList.add('admin-live-editable');
        node.parentNode.replaceChild(wrapper, node);
        return;
      }

      element.dataset.adminSiteEditId = entry.id;
      element.dataset.adminSiteEditPage = pagePath;
      element.dataset.adminKind = entry.kind === 'backgroundImage' ? 'image' : entry.kind;
      element.title = `Edit ${entry.label}`;
      element.classList.add('admin-live-editable');
    });

    const candidates = Array.from(doc.querySelectorAll('h1,h2,h3,h4,p,span,a,div,img'));
    candidates.forEach((element) => {
      if (element.dataset.adminSiteEditId || element.closest('[data-admin-site-edit-id]')) return;
      const match = matchElement(element, values);
      if (!match) return;
      const tag = element.tagName.toLowerCase();
      element.dataset.adminFile = match.fileId;
      element.dataset.adminPath = match.pathText;
      element.dataset.adminKind = tag === 'img' || (element.getAttribute('style') || '').includes('url(') ? 'image' : 'text';
      element.title = `Edit ${match.label}`;
      element.classList.add('admin-live-editable');
    });

    let style = doc.getElementById('admin-live-preview-style');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'admin-live-preview-style';
      style.textContent = `
        .admin-live-editable {
          outline: 3px solid rgba(0, 61, 165, 0.45) !important;
          outline-offset: 3px !important;
          cursor: pointer !important;
        }
        .admin-live-editable:hover,
        .admin-live-editable.admin-live-selected {
          outline-color: #FFD100 !important;
          box-shadow: 0 0 0 6px rgba(255, 209, 0, 0.24) !important;
        }
      `;
      doc.head.appendChild(style);
    }

    if (!doc.documentElement.dataset.adminClickBound) {
      doc.addEventListener('click', handlePreviewClick, true);
      doc.documentElement.dataset.adminClickBound = 'true';
    }
  }

  function handlePreviewClick(event) {
    const element = event.target.closest?.('[data-admin-site-edit-id],[data-admin-file][data-admin-path]');
    if (!element) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const iframe = $('#live-preview');
    iframe.contentDocument.querySelectorAll('.admin-live-selected').forEach((item) => {
      item.classList.remove('admin-live-selected');
    });
    element.classList.add('admin-live-selected');

    if (element.dataset.adminSiteEditId) {
      const pagePath = normalizePath(element.dataset.adminSiteEditPage);
      const editId = element.dataset.adminSiteEditId;
      const entry = siteEditEntriesForPath(pagePath).find((item) => item.id === editId);
      if (!entry) return;
      const kind = element.dataset.adminKind || entry.kind || 'text';
      state.selected = { type: 'siteEdit', pagePath, editId, kind, element };
      $('#selected-label').textContent = entry.label || 'Visual page edit';
      $('#selected-path').textContent = `${pagePath} / ${entry.id}`;
      $('#quick-edit-value').disabled = false;
      $('#quick-edit-value').value = entry.value || '';
      $('#quick-upload-field').classList.toggle('hidden', kind !== 'image');
      $('#stage-selected-btn').disabled = false;
      return;
    }

    const fileId = element.dataset.adminFile;
    const path = element.dataset.adminPath.split('.');
    const kind = element.dataset.adminKind || 'text';
    const value = getByPath(contentFor(fileId), path);
    state.selected = { fileId, path, kind, element };
    $('#selected-label').textContent = `${state.entries.get(fileId)?.label || fileId}: ${path.map(labelize).join(' / ')}`;
    $('#selected-path').textContent = `${fileId}.${path.join('.')}`;
    $('#quick-edit-value').disabled = false;
    $('#quick-edit-value').value = value || '';
    $('#quick-upload-field').classList.toggle('hidden', kind !== 'image');
    $('#stage-selected-btn').disabled = false;
  }

  function updatePreviewElement(selection, value) {
    if (!selection?.element) return;
    if (selection.kind === 'image') {
      if (selection.element.tagName.toLowerCase() === 'img') {
        selection.element.setAttribute('src', value);
      } else {
        selection.element.style.setProperty('--page-hero-image', `url('${value}')`);
        selection.element.style.backgroundImage = `url('${value}')`;
      }
    } else {
      selection.element.textContent = value;
    }
  }

  function updateDraftSummary() {
    const count = state.drafts.size;
    const files = Array.from(state.drafts.keys()).map((id) => state.entries.get(id)?.label || id);
    $('#draft-summary').textContent = count
      ? `${count} file${count === 1 ? '' : 's'} staged: ${files.join(', ')}.`
      : 'No staged changes yet.';
    $('#dirty-label').textContent = count
      ? `${count} staged file${count === 1 ? '' : 's'}`
      : 'No unsaved changes';
    $('#publish-all-btn').disabled = count === 0;
    renderTabs();
  }

  function collectActiveFile() {
    const entry = activeEntry();
    const content = clone(contentFor(entry.id));
    $$('[data-field-path]', $('#admin-fields')).forEach((input) => {
      let value = input.value;
      if (input.dataset.json === 'true') value = JSON.parse(value || '[]');
      setByPath(content, input.dataset.fieldPath.split('.'), value);
    });
    return content;
  }

  function loadTestContent() {
    const files = [
      { id: 'site', label: 'Site Settings', path: 'src/_data/site.json', previewPath: '/' },
      { id: 'home', label: 'Home Page', path: 'src/_data/cms/home.json', previewPath: '/' },
      { id: 'about', label: 'About Page', path: 'src/_data/cms/about.json', previewPath: '/about/' },
      { id: 'whatWeDo', label: 'What We Do Page', path: 'src/_data/cms/whatWeDo.json', previewPath: '/what-we-do/' },
      { id: 'youthPrograms', label: 'Youth Programs Page', path: 'src/_data/cms/youthPrograms.json', previewPath: '/youth-programs/' },
      { id: 'pancake', label: 'Pancake Day Page', path: 'src/_data/cms/pancake.json', previewPath: '/pancake-day/' },
      { id: 'events', label: 'Events Page Copy', path: 'src/_data/cms/events.json', previewPath: '/events/' },
      { id: 'resources', label: 'Resources Page', path: 'src/_data/cms/resources.json', previewPath: '/resources/' },
      { id: 'join', label: 'Join Page', path: 'src/_data/cms/join.json', previewPath: '/join/' },
      { id: 'donate', label: 'Donate Page', path: 'src/_data/cms/donate.json', previewPath: '/donate/' },
      { id: 'contact', label: 'Contact Page', path: 'src/_data/cms/contact.json', previewPath: '/contact/' },
      { id: 'editorContent', label: 'Events, Newsletters & Speakers', path: 'src/_data/editorContent.json', previewPath: '/events/' },
      { id: 'siteEdits', label: 'Visual Page Edits', path: 'src/_data/siteEdits.json', previewPath: '/' },
    ];
    const entries = [
      {
        ...files[0],
        content: {
          name: 'Kiwanis Club of Winchester, Virginia',
          email: 'sec@winvakiw.org',
          meetings: { day: 'Wednesdays', time: 'noon', location: 'Winchester Moose Club', street: '215 E. Cork St.' },
        },
        history: [{ message: 'Test mode only - no GitHub save yet', date: new Date().toISOString(), author: 'Local UI preview' }],
      },
      {
        ...files[1],
        content: {
          hero: {
            image: '/assets/uploads/2026/06/WincKiwan.png',
            imageAlt: 'Children smiling together in a warm Winchester Kiwanis community service scene',
            eyebrow: 'Serving Winchester since 1922',
            line1: 'Changing',
            line2: 'Winchester,',
            line3: 'One',
            highlight: 'Child',
            lede: 'A volunteer service club helping children, families, and neighbors across the Shenandoah Valley.',
            note: 'Weekly meetings: Wednesdays at noon at the Winchester Moose Club.',
          },
          mission: {
            title: 'Dedicated to Children & Community Since Day One',
            body: 'Kiwanis is a global organization of volunteers dedicated to improving the world one child and one community at a time.',
            body2: 'We meet every Wednesday at noon at the Winchester Moose Club.',
          },
        },
        history: [],
      },
      {
        ...files[2],
        content: {
          hero: {
            image: '/assets/uploads/2026/06/KiwanisHero.png',
            position: 'center 42%',
            title: 'About Our Club',
            subtitle: "Chartered in 1922, we've spent over a century making Winchester, Virginia a better place for children and families.",
          },
        },
        history: [],
      },
      {
        ...files[3],
        content: {
          hero: {
            image: '/assets/uploads/2026/06/WhatWeDoHero.png',
            title: 'What We Do',
            subtitle: 'Service projects, youth leadership, fundraising, and community support.',
          },
          intro: {
            eyebrow: 'Local service',
            title: 'Hands-on help for children and neighbors',
            body: 'The club supports youth programs, scholarships, food security, and community partners across Winchester.',
          },
        },
        history: [],
      },
      {
        ...files[4],
        content: {
          hero: {
            image: '/assets/uploads/2026/06/YouthProgramsHero.png',
            title: 'Youth Programs',
            subtitle: 'Helping students build confidence, service habits, and leadership skills.',
          },
          intro: {
            title: 'Leadership starts early',
            body1: 'Kiwanis supports student leadership through the Kiwanis family of clubs.',
            body2: 'These programs give young people a practical path into service.',
          },
        },
        history: [],
      },
      {
        ...files[5],
        content: {
          hero: {
            image: '/assets/uploads/2026/06/PancakeDayHero.png',
            eyebrow: 'Pancake Day',
            highlight: 'Breakfast',
            lede: 'A beloved fundraiser that helps support children and families in Winchester.',
            note: 'Final date and ticket details can be updated after board approval.',
          },
          event: {
            hours: 'To be announced',
            location: 'To be announced',
            statusBanner: 'Event details will be published when confirmed.',
          },
        },
        history: [],
      },
      {
        ...files[6],
        content: {
          hero: {
            image: '/assets/uploads/2024/09/Picnic-13-1024x768.jpg',
            title: 'Events & Newsletters',
            subtitle: 'Recent club activity, newsletters, photos, and meeting updates.',
          },
          eventsSection: {
            title: 'Recent Events',
            intro: 'Highlights from club service, fellowship, and community projects.',
          },
          newslettersSection: {
            title: 'Newsletter Archive',
            intro: 'Download recent editions of the Kiwanis Kourier.',
          },
        },
        history: [],
      },
      {
        ...files[7],
        content: {
          hero: {
            image: '/assets/uploads/2023/02/Bright-Futures.png',
            title: 'Resources & Support',
            subtitle: 'Helpful links for members, partners, and community organizations.',
          },
          quickLinks: {
            title: 'Common Requests',
            intro: 'Find newsletters, support guidance, member resources, and contact paths.',
          },
        },
        history: [],
      },
      {
        ...files[8],
        content: {
          hero: {
            image: '/assets/uploads/2026/06/KiwanisHero.png',
            title: 'Join Our Club',
            subtitle: 'Serve children, meet neighbors, and make Winchester stronger.',
          },
          why: {
            title: 'Why Join Kiwanis',
            intro: 'Members build friendships while doing practical service that matters locally.',
          },
        },
        history: [],
      },
      {
        ...files[9],
        content: {
          hero: {
            image: '/assets/uploads/2026/06/WhatWeDoHero.png',
            title: 'Donate',
            subtitle: 'Support service projects that help children and families.',
          },
          main: {
            title: 'Support the Kiwanis Club of Winchester',
            intro: 'Donation instructions can be updated after the board approves the final process.',
          },
        },
        history: [],
      },
      {
        ...files[10],
        content: {
          hero: {
            image: '/assets/uploads/2024/09/Picnic-5-1024x768.jpg',
            title: 'Contact Us',
            subtitle: 'Ask about membership, meetings, support requests, and club projects.',
          },
          form: {
            title: 'Send a Message',
            intro: 'Use the club contact path for questions and support requests.',
          },
        },
        history: [],
      },
      {
        ...files[11],
        content: {
          events: [
            { id: 'demo-event', title: 'Demo Service Event', date: '2026-07-01', category: 'Club Event', eventMeta: 'Demo mode only', headerColor: 'blue', facebookUrl: '', photos: [] },
          ],
          newsletters: [
            { id: 'demo-newsletter', title: 'Demo Newsletter', date: '2026-07-01', year: '2026', pdfUrl: '/assets/uploads/2026/01/2026-01-Jan-Kourier-rev1.pdf' },
          ],
          speakers: {
            intro: 'Demo speaker content for board review.',
            upcoming: [{ id: 'demo-speaker', date: '2026-07-08', name: 'Guest Speaker', organization: 'Community Partner', topic: 'Service in Winchester', title: '', meta: 'Wednesday noon meeting', description: 'Demo mode only.' }],
            recent: [],
          },
        },
        history: [],
      },
      {
        ...files[12],
        content: {
          version: 1,
          pages: {
            '/': [
              {
                id: 'test-home-hero-eyebrow',
                selector: 'body > main:nth-of-type(1) > section:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(1)',
                kind: 'text',
                nodeIndex: 0,
                label: 'Hero / P / Serving Winchester since 1922',
                value: 'Serving Winchester since 1922',
              },
            ],
          },
        },
        history: [],
      },
    ];
    state.files = files;
    state.entries = new Map(entries.map((entry) => [entry.id, entry]));
    state.activeId = files[1].id;
    renderActiveFile();
    setStatus('Admin demo mode. Changes are UI-only and will not create GitHub commits.');
  }

  async function loadContent(fileId = '') {
    if (IS_TEST_LOGIN && state.token === 'test-admin') {
      loadTestContent();
      return;
    }
    setStatus('Loading admin content...');
    const query = fileId ? `?file=${encodeURIComponent(fileId)}` : '';
    const payload = await api(`/api/admin/content${query}`);
    state.files = payload.files || state.files;
    (payload.entries || []).forEach((entry) => state.entries.set(entry.id, entry));
    if (!state.activeId) state.activeId = state.files[1]?.id || state.files[0]?.id || payload.entries?.[0]?.id || '';
    if (fileId) state.activeId = fileId;
    renderActiveFile();
    setStatus('Admin content loaded.');
  }

  async function uploadSelectedImage() {
    const fileInput = $('#quick-upload-file');
    const file = fileInput?.files?.[0];
    if (!file || !state.selected) {
      setStatus('Choose an image before uploading.', true);
      return;
    }
    if (IS_TEST_LOGIN && state.token === 'test-admin') {
      const fakePath = `/assets/uploads/editor/test/${file.name.replace(/\s+/g, '-')}`;
      $('#quick-edit-value').value = fakePath;
      fileInput.value = '';
      setStatus('Test upload added to the draft editor only.');
      return;
    }
    setStatus(`Uploading ${file.name}...`);
    const contentBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const payload = await api('/api/editor/upload', {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        contentBase64,
        kind: 'image',
      }),
    });
    $('#quick-edit-value').value = payload.publicPath;
    fileInput.value = '';
    setStatus('Image uploaded. Stage the selected change when ready.');
  }

  async function publishDraft() {
    if (!state.drafts.size) return;
    $('#publish-all-btn').disabled = true;
    $('#save-btn').disabled = true;
    try {
      if (IS_TEST_LOGIN && state.token === 'test-admin') {
        state.drafts.forEach((content, fileId) => {
          const entry = state.entries.get(fileId);
          entry.content = clone(content);
          entry.history = [{ message: 'Test publish - UI preview only', date: new Date().toISOString(), author: state.email || 'Local tester' }];
        });
        state.drafts.clear();
        renderActiveFile();
        setStatus('Test publish complete. No GitHub commit was created.');
        return;
      }

      const staged = Array.from(state.drafts.entries());
      for (let index = 0; index < staged.length; index += 1) {
        const [fileId, content] = staged[index];
        const label = state.entries.get(fileId)?.label || fileId;
        setStatus(`Publishing ${label} (${index + 1} of ${staged.length})...`);
        await api('/api/admin/save', {
          method: 'POST',
          body: JSON.stringify({ file: fileId, content }),
        });
      }
      state.drafts.clear();
      await loadContent(state.activeId);
      setStatus('Draft published. Cloudflare Pages should rebuild shortly.');
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      $('#publish-all-btn').disabled = state.drafts.size === 0;
      $('#save-btn').disabled = false;
    }
  }

  async function restoreActiveFile(commitSha) {
    const entry = activeEntry();
    if (!entry || !commitSha) return;
    if (state.drafts.has(entry.id) && !window.confirm('Discard staged changes and restore this file from the selected commit?')) return;
    if (!window.confirm(`Restore ${entry.label} to commit ${commitSha.slice(0, 7)}? This will create a new restore commit.`)) return;

    try {
      setStatus(`Restoring ${entry.label} from ${commitSha.slice(0, 7)}...`);
      await api('/api/admin/restore', {
        method: 'POST',
        body: JSON.stringify({ file: entry.id, commitSha }),
      });
      state.drafts.delete(entry.id);
      await loadContent(entry.id);
      setStatus('Restore published. Cloudflare Pages should rebuild shortly.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function bindEvents() {
    $('#otp-request-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      state.email = $('#admin-email').value.trim().toLowerCase();
      if (IS_TEST_LOGIN) {
        state.challenge = 'admin-demo-mode';
        $('#otp-verify-form').classList.remove('hidden');
        $('#admin-code').focus();
        setStatus('Demo mode: enter any fake six-digit code, such as 123456.');
        return;
      }
      try {
        setStatus('Sending one-time code...');
        const payload = await api('/api/editor/request-otp', {
          method: 'POST',
          body: JSON.stringify({ email: state.email }),
        });
        state.challenge = payload.challenge || '';
        $('#otp-verify-form').classList.remove('hidden');
        setStatus(payload.devCode ? `Development code: ${payload.devCode}` : 'If that email is approved, a code has been sent.');
      } catch (error) {
        setStatus(error.message, true);
      }
    });

    $('#otp-verify-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        if (IS_TEST_LOGIN) {
          const code = $('#admin-code').value.trim();
          if (!/^\d{4,6}$/.test(code)) throw new Error('Enter any fake numeric code to continue in demo mode.');
          state.token = 'test-admin';
          localStorage.removeItem(SESSION_KEY);
          showApp();
          await loadContent();
          return;
        }
        const payload = await api('/api/editor/verify-otp', {
          method: 'POST',
          body: JSON.stringify({
            email: state.email,
            code: $('#admin-code').value.trim(),
            challenge: state.challenge || (state.email === 'demo@winvakiw.org' ? 'kiwanis-live-demo-challenge' : ''),
          }),
        });
        if (payload.role !== 'admin') throw new Error('This login is approved for the limited editor, not the full admin portal.');
        state.token = payload.token;
        localStorage.setItem(SESSION_KEY, state.token);
        showApp();
        await loadContent();
      } catch (error) {
        setStatus(error.message, true);
      }
    });

    $('#logout-btn').addEventListener('click', () => {
      state.token = '';
      localStorage.removeItem(SESSION_KEY);
      showLogin();
    });

    $('#admin-tabs').addEventListener('click', (event) => {
      const button = event.target.closest('[data-file-id]');
      if (!button || button.dataset.fileId === state.activeId) return;
      state.activeId = button.dataset.fileId;
      renderActiveFile();
    });

    $('#admin-fields').addEventListener('input', () => {
      state.drafts.set(state.activeId, collectActiveFile());
      updateDraftSummary();
      decoratePreview();
    });

    $('#history-list').addEventListener('click', (event) => {
      const button = event.target.closest('[data-restore-sha]');
      if (!button) return;
      restoreActiveFile(button.dataset.restoreSha);
    });

    $('#reload-file').addEventListener('click', async () => {
      if (state.drafts.has(state.activeId) && !window.confirm('Discard staged changes for this file and reload it?')) return;
      state.drafts.delete(state.activeId);
      try {
        await loadContent(state.activeId);
      } catch (error) {
        setStatus(error.message, true);
      }
    });

    $('#admin-form').addEventListener('submit', (event) => {
      event.preventDefault();
      try {
        state.drafts.set(state.activeId, collectActiveFile());
        updateDraftSummary();
        setStatus('Page staged. Continue editing or publish the draft when ready.');
      } catch (error) {
        setStatus(error.message, true);
      }
    });

    $('#live-preview').addEventListener('load', () => {
      try {
        decoratePreview();
      } catch (error) {
        setStatus(`Preview loaded, but edit highlighting failed: ${error.message}`, true);
      }
    });

    $('#stage-selected-btn').addEventListener('click', () => {
      if (!state.selected) return;
      const value = $('#quick-edit-value').value;
      if (state.selected.type === 'siteEdit') {
        stageSiteEdit(state.selected.pagePath, state.selected.editId, value);
      } else {
        stageValue(state.selected.fileId, state.selected.path, value);
      }
      updatePreviewElement(state.selected, value);
      setStatus('Change staged. Keep editing or publish the draft.');
    });

    $('#quick-upload-btn').addEventListener('click', () => {
      uploadSelectedImage().catch((error) => setStatus(error.message, true));
    });

    $('#publish-all-btn').addEventListener('click', publishDraft);

    window.addEventListener('beforeunload', (event) => {
      if (!state.drafts.size) return;
      event.preventDefault();
      event.returnValue = '';
    });
  }

  setDemoLoginCopy();
  bindEvents();
  $('#publish-all-btn').disabled = true;

  if (IS_TEST_LOGIN && state.token === 'test-admin') {
    state.token = '';
    localStorage.removeItem(SESSION_KEY);
  }

  if (state.token) {
    showApp();
    loadContent().catch((error) => {
      localStorage.removeItem(SESSION_KEY);
      state.token = '';
      showLogin();
      setStatus(error.message, true);
    });
  }
})();
