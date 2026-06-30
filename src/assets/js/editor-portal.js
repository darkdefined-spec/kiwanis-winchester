(function () {
  const SESSION_KEY = 'kiwanis_editor_session';
  const state = {
    challenge: '',
    email: '',
    token: localStorage.getItem(SESSION_KEY) || '',
    content: null,
    dirty: false,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const params = new URLSearchParams(window.location.search);
  const isLivePublishDemo = params.get('live') === '1';
  const IS_TEST_LOGIN =
    !isLivePublishDemo &&
    (['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname) ||
      window.location.hostname.endsWith('.pages.dev') ||
      params.has('editorTest'));

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function setStatus(message, isError) {
    const authStatus = $('#auth-status');
    const saveStatus = $('#save-status');
    if (authStatus && !$('#login-panel').classList.contains('hidden')) authStatus.textContent = message || '';
    if (saveStatus && $('#login-panel').classList.contains('hidden')) saveStatus.textContent = message || 'Loaded content will publish through GitHub and Cloudflare Pages.';
    if (authStatus) authStatus.style.color = isError ? '#b42318' : '';
    if (saveStatus) saveStatus.style.color = isError ? '#b42318' : '';
  }

  function setDirty(value) {
    state.dirty = value;
    $('#dirty-label').textContent = value ? 'Unsaved changes' : 'No unsaved changes';
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
    $('#editor-app').classList.remove('hidden');
  }

  function showLogin() {
    $('#editor-app').classList.add('hidden');
    $('#login-panel').classList.remove('hidden');
  }

  function getInitialContent() {
    try {
      return JSON.parse($('#editor-initial-content')?.textContent || '{}');
    } catch (_error) {
      return {};
    }
  }

  function sortedByDateDesc(items) {
    return [...(items || [])].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }

  function normalizeContent(content) {
    const safe = content && typeof content === 'object' ? content : {};
    return {
      events: sortedByDateDesc(safe.events || []),
      newsletters: sortedByDateDesc(safe.newsletters || []).map((item) => ({
        ...item,
        year: String(item.year || item.date || '').slice(0, 4),
      })),
      speakers: {
        intro: safe.speakers?.intro || '',
        upcoming: sortedByDateDesc(safe.speakers?.upcoming || []),
        recent: sortedByDateDesc(safe.speakers?.recent || []),
      },
    };
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function eventItem(item, index) {
    const photos = Array.isArray(item.photos) ? item.photos : [];
    return `
      <article class="editor-item" data-kind="event" data-index="${index}">
        <div class="item-head">
          <div class="item-title">${escapeHtml(item.title || 'Untitled event')}</div>
          <div class="item-actions">
            <button type="button" data-move="up">Up</button>
            <button type="button" data-move="down">Down</button>
            <button type="button" data-remove>Remove</button>
          </div>
        </div>
        <div class="item-body">
          ${field('Title', 'title', item.title)}
          ${field('Date', 'date', item.date, 'date')}
          ${field('Category', 'category', item.category)}
          ${field('Details line', 'eventMeta', item.eventMeta)}
          ${selectField('Header color', 'headerColor', item.headerColor || 'blue', [['blue', 'Blue'], ['gold', 'Gold']])}
          ${field('Facebook URL', 'facebookUrl', item.facebookUrl, 'url')}
          <div class="photos-editor">
            <span>Photos</span>
            <div class="photo-list">
              ${photos.map(photoRow).join('')}
            </div>
            <div class="upload-row">
              <input type="file" accept="image/*" data-upload-file>
              <button type="button" data-upload="image">Upload Image</button>
              <button type="button" data-add-photo>Add Existing URL</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function newsletterItem(item, index) {
    return `
      <article class="editor-item" data-kind="newsletter" data-index="${index}">
        <div class="item-head">
          <div class="item-title">${escapeHtml(item.title || 'Untitled newsletter')}</div>
          <div class="item-actions">
            <button type="button" data-move="up">Up</button>
            <button type="button" data-move="down">Down</button>
            <button type="button" data-remove>Remove</button>
          </div>
        </div>
        <div class="item-body">
          ${field('Title', 'title', item.title)}
          ${field('Publication date', 'date', item.date, 'date')}
          ${field('PDF URL', 'pdfUrl', item.pdfUrl, 'url', 'full')}
          <div class="field full">
            <span>Upload PDF</span>
            <div class="upload-row">
              <input type="file" accept="application/pdf" data-upload-file>
              <button type="button" data-upload="pdf">Upload PDF</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function speakerItem(item, kind, index) {
    return `
      <article class="editor-item" data-kind="${kind}" data-index="${index}">
        <div class="item-head">
          <div class="item-title">${escapeHtml(item.name || 'Speaker')}</div>
          <div class="item-actions">
            <button type="button" data-move="up">Up</button>
            <button type="button" data-move="down">Down</button>
            <button type="button" data-remove>Remove</button>
          </div>
        </div>
        <div class="item-body">
          ${field('Date', 'date', item.date, 'date')}
          ${field('Name', 'name', item.name)}
          ${field('Organization', 'organization', item.organization)}
          ${field('Topic', 'topic', item.topic)}
          ${field('Title/role', 'title', item.title)}
          ${field('Location/time', 'meta', item.meta)}
          ${textareaField('Description', 'description', item.description)}
        </div>
      </article>
    `;
  }

  function field(label, name, value, type = 'text', extraClass = '') {
    return `<label class="field ${extraClass}"><span>${label}</span><input type="${type}" data-field="${name}" value="${escapeHtml(value)}"></label>`;
  }

  function textareaField(label, name, value) {
    return `<label class="field full speaker-description"><span>${label}</span><textarea data-field="${name}" rows="3">${escapeHtml(value)}</textarea></label>`;
  }

  function selectField(label, name, value, options) {
    return `<label class="field"><span>${label}</span><select data-field="${name}">${options.map(([val, text]) => `<option value="${escapeHtml(val)}"${val === value ? ' selected' : ''}>${escapeHtml(text)}</option>`).join('')}</select></label>`;
  }

  function photoRow(photo = {}) {
    return `
      <div class="photo-row">
        <input data-photo-field="src" placeholder="/assets/uploads/..." value="${escapeHtml(photo.src)}">
        <input data-photo-field="alt" placeholder="Alt text" value="${escapeHtml(photo.alt)}">
        <select data-photo-field="objectPosition">
          ${['center center', 'top center', 'bottom center', 'center left', 'center right'].map((value) => `<option value="${value}"${(photo.objectPosition || 'center center') === value ? ' selected' : ''}>${value}</option>`).join('')}
        </select>
        <button type="button" data-remove-photo>Remove</button>
      </div>
    `;
  }

  function render() {
    const content = state.content;
    $('#events-list').innerHTML = content.events.map(eventItem).join('');
    $('#newsletters-list').innerHTML = content.newsletters.map(newsletterItem).join('');
    $('#speakers-intro').value = content.speakers.intro || '';
    $('#upcoming-speakers-list').innerHTML = content.speakers.upcoming.map((item, index) => speakerItem(item, 'upcomingSpeaker', index)).join('');
    $('#recent-speakers-list').innerHTML = content.speakers.recent.map((item, index) => speakerItem(item, 'recentSpeaker', index)).join('');
  }

  function readItem(article) {
    const item = {};
    $$('[data-field]', article).forEach((input) => {
      item[input.dataset.field] = input.value.trim();
    });
    if (article.dataset.kind === 'event') {
      item.id = state.content.events[Number(article.dataset.index)]?.id || uid('event');
      item.photos = $$('.photo-row', article).map((row) => {
        const photo = {};
        $$('[data-photo-field]', row).forEach((input) => {
          photo[input.dataset.photoField] = input.value.trim();
        });
        return photo;
      }).filter((photo) => photo.src);
    }
    if (article.dataset.kind === 'newsletter') {
      item.id = state.content.newsletters[Number(article.dataset.index)]?.id || uid('newsletter');
      item.year = String(item.date || '').slice(0, 4);
    }
    if (article.dataset.kind === 'upcomingSpeaker') {
      item.id = state.content.speakers.upcoming[Number(article.dataset.index)]?.id || uid('speaker');
    }
    if (article.dataset.kind === 'recentSpeaker') {
      item.id = state.content.speakers.recent[Number(article.dataset.index)]?.id || uid('speaker');
    }
    return item;
  }

  function collect() {
    state.content.events = $$('#events-list .editor-item').map(readItem);
    state.content.newsletters = $$('#newsletters-list .editor-item').map(readItem);
    state.content.speakers.intro = $('#speakers-intro').value.trim();
    state.content.speakers.upcoming = $$('#upcoming-speakers-list .editor-item').map(readItem);
    state.content.speakers.recent = $$('#recent-speakers-list .editor-item').map(readItem);
    state.content.newsletters.forEach((item) => { item.year = String(item.date || '').slice(0, 4); });
    return state.content;
  }

  function targetArray(kind) {
    if (kind === 'event') return state.content.events;
    if (kind === 'newsletter') return state.content.newsletters;
    if (kind === 'upcomingSpeaker') return state.content.speakers.upcoming;
    if (kind === 'recentSpeaker') return state.content.speakers.recent;
    return [];
  }

  function blankItem(kind) {
    if (kind === 'event') {
      return { id: uid('event'), title: 'New Event', date: new Date().toISOString().slice(0, 10), category: 'Club Event', eventMeta: '', headerColor: 'blue', facebookUrl: '', photos: [] };
    }
    if (kind === 'newsletter') {
      const date = new Date().toISOString().slice(0, 10);
      return { id: uid('newsletter'), title: 'New Newsletter', date, year: date.slice(0, 4), pdfUrl: '' };
    }
    return { id: uid('speaker'), date: new Date().toISOString().slice(0, 10), name: '', organization: '', topic: '', title: '', meta: 'Wednesday noon meeting', description: '' };
  }

  async function uploadFile(article, type) {
    const fileInput = $('[data-upload-file]', article);
    const file = fileInput?.files?.[0];
    if (!file) {
      setStatus('Choose a file before uploading.', true);
      return;
    }
    if (IS_TEST_LOGIN && state.token === 'test') {
      const fakePath = `/assets/uploads/editor/test/${file.name.replace(/\s+/g, '-')}`;
      if (type === 'pdf') {
        $('[data-field="pdfUrl"]', article).value = fakePath;
      } else {
        const list = $('.photo-list', article);
        list.insertAdjacentHTML('beforeend', photoRow({ src: fakePath, alt: '', objectPosition: 'center center' }));
      }
      fileInput.value = '';
      setDirty(true);
      setStatus('Test upload added to the UI only. It does not publish.');
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
        kind: type,
      }),
    });
    if (type === 'pdf') {
      $('[data-field="pdfUrl"]', article).value = payload.publicPath;
    } else {
      const list = $('.photo-list', article);
      list.insertAdjacentHTML('beforeend', photoRow({ src: payload.publicPath, alt: '', objectPosition: 'center center' }));
    }
    fileInput.value = '';
    setDirty(true);
    setStatus('Upload saved to GitHub. Remember to save and publish the content change too.');
  }

  async function loadContent() {
    if (IS_TEST_LOGIN && state.token === 'test') {
      state.content = normalizeContent(getInitialContent());
      render();
      renderHistory([
        {
          message: 'Test mode only - no GitHub save yet',
          date: new Date().toISOString(),
          author: 'Local UI preview',
          url: '',
        },
      ]);
      setDirty(false);
      setStatus('Test login active. Changes are UI-only until Cloudflare secrets are configured.');
      return;
    }
    setStatus('Loading editor content...');
    const payload = await api('/api/editor/content');
    state.content = normalizeContent(payload.content);
    render();
    renderHistory(payload.history || []);
    setDirty(false);
    setStatus('Editor content loaded.');
  }

  function renderHistory(history) {
    const list = $('#history-list');
    if (!list) return;
    if (!history.length) {
      list.innerHTML = '<p class="hint">No recent saves found yet.</p>';
      return;
    }
    const canRestore = !(IS_TEST_LOGIN && state.token === 'test');
    list.innerHTML = history.map((commit) => `
      <div class="history-row">
        <div>
          <strong>${escapeHtml(commit.message || 'Content update')}</strong>
          <small>${escapeHtml(commit.date || '')} by ${escapeHtml(commit.author || 'Unknown')}</small>
        </div>
        <div class="history-actions">
          ${commit.url ? `<a href="${escapeHtml(commit.url)}" target="_blank" rel="noopener">View</a>` : ''}
          ${canRestore && commit.sha ? `<button type="button" class="history-restore" data-restore-sha="${escapeHtml(commit.sha)}">Restore</button>` : ''}
        </div>
      </div>
    `).join('');
  }

  async function refreshHistory() {
    if (IS_TEST_LOGIN && state.token === 'test') {
      renderHistory([
        {
          message: 'Test mode only - no GitHub save yet',
          date: new Date().toISOString(),
          author: 'Local UI preview',
          url: '',
        },
      ]);
      return;
    }
    const payload = await api('/api/editor/content');
    renderHistory(payload.history || []);
  }

  async function restoreContent(commitSha) {
    if (!commitSha) return;
    if (state.dirty && !window.confirm('Discard unsaved changes and restore from the selected commit?')) return;
    if (!window.confirm(`Restore editor content to commit ${commitSha.slice(0, 7)}? This will create a new restore commit.`)) return;

    try {
      setStatus(`Restoring editor content from ${commitSha.slice(0, 7)}...`);
      await api('/api/editor/restore', {
        method: 'POST',
        body: JSON.stringify({ commitSha }),
      });
      await loadContent();
      setStatus('Restore published. Cloudflare Pages should rebuild shortly.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function bindEvents() {
    $('#otp-request-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      state.email = $('#editor-email').value.trim().toLowerCase();
      if (IS_TEST_LOGIN) {
        state.token = 'test';
        localStorage.setItem(SESSION_KEY, state.token);
        showApp();
        await loadContent();
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
        const payload = await api('/api/editor/verify-otp', {
          method: 'POST',
          body: JSON.stringify({
            email: state.email,
            code: $('#editor-code').value.trim(),
            challenge: state.challenge,
          }),
        });
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

    $$('.tab-button').forEach((button) => {
      button.addEventListener('click', () => {
        $$('.tab-button').forEach((item) => item.classList.remove('active'));
        $$('.tab-panel').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        $(`#${button.dataset.tab}-tab`).classList.add('active');
      });
    });

    document.addEventListener('input', (event) => {
      if (event.target.closest('#editor-form')) setDirty(true);
    });

    document.addEventListener('click', async (event) => {
      const add = event.target.closest('[data-add]');
      if (add) {
        collect();
        targetArray(add.dataset.add).unshift(blankItem(add.dataset.add));
        render();
        setDirty(true);
        return;
      }

      const article = event.target.closest('.editor-item');
      if (!article) return;

      if (event.target.closest('[data-remove]')) {
        collect();
        targetArray(article.dataset.kind).splice(Number(article.dataset.index), 1);
        render();
        setDirty(true);
      }

      if (event.target.closest('[data-move]')) {
        collect();
        const arr = targetArray(article.dataset.kind);
        const index = Number(article.dataset.index);
        const direction = event.target.closest('[data-move]').dataset.move === 'up' ? -1 : 1;
        const next = index + direction;
        if (next >= 0 && next < arr.length) {
          [arr[index], arr[next]] = [arr[next], arr[index]];
          render();
          setDirty(true);
        }
      }

      if (event.target.closest('[data-add-photo]')) {
        $('.photo-list', article).insertAdjacentHTML('beforeend', photoRow({ objectPosition: 'center center' }));
        setDirty(true);
      }

      if (event.target.closest('[data-remove-photo]')) {
        event.target.closest('.photo-row')?.remove();
        setDirty(true);
      }

      const upload = event.target.closest('[data-upload]');
      if (upload) {
        try {
          await uploadFile(article, upload.dataset.upload);
        } catch (error) {
          setStatus(error.message, true);
        }
      }
    });

    $('#editor-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const content = collect();
        $('#save-btn').disabled = true;
        if (IS_TEST_LOGIN && state.token === 'test') {
          state.content = normalizeContent(content);
          setDirty(false);
          setStatus('Test save complete. This only updates the local UI preview; it does not publish.');
          renderHistory([
            {
              message: 'Test save - UI preview only',
              date: new Date().toISOString(),
              author: state.email || 'Local tester',
              url: '',
            },
          ]);
          return;
        }
        setStatus('Saving to GitHub. Cloudflare will rebuild after the commit...');
        const payload = await api('/api/editor/save', {
          method: 'POST',
          body: JSON.stringify({ content }),
        });
        setDirty(false);
        setStatus(`Saved. Commit ${payload.commit?.sha?.slice(0, 7) || ''} created. Cloudflare Pages should rebuild shortly.`);
        await refreshHistory();
      } catch (error) {
        setStatus(error.message, true);
      } finally {
        $('#save-btn').disabled = false;
      }
    });

    $('#refresh-history').addEventListener('click', refreshHistory);

    $('#history-list').addEventListener('click', (event) => {
      const button = event.target.closest('[data-restore-sha]');
      if (!button) return;
      restoreContent(button.dataset.restoreSha);
    });

    window.addEventListener('beforeunload', (event) => {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = '';
    });
  }

  bindEvents();
  if (state.token) {
    if (IS_TEST_LOGIN) state.token = 'test';
    showApp();
    loadContent().catch((error) => {
      localStorage.removeItem(SESSION_KEY);
      state.token = '';
      showLogin();
      setStatus(error.message, true);
    });
  }
})();
