(function () {
  var STORAGE_KEY = 'KIWANIS_ASSISTANT_SESSION_ID';

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function getSessionId() {
    try {
      var existing = localStorage.getItem(STORAGE_KEY);
      if (existing) return existing;
      var created = 'kiwanis-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(STORAGE_KEY, created);
      return created;
    } catch (error) {
      return 'kiwanis-session';
    }
  }

  function buildCorpus() {
    var nodes = document.querySelectorAll('main h1, main h2, main h3, main p, main li, footer p, footer a');
    var seen = {};
    var corpus = [];
    nodes.forEach(function (node) {
      var text = normalizeText(node.textContent);
      if (text.length >= 24 && !seen[text]) {
        seen[text] = true;
        corpus.push(text);
      }
    });
    return corpus;
  }

  function keywordScore(query, text) {
    var q = normalizeText(query).toLowerCase();
    var t = normalizeText(text).toLowerCase();
    if (!q || !t) return 0;
    var stopwords = { what: true, when: true, where: true, why: true, how: true, the: true, and: true, for: true, about: true, kiwanis: true, winchester: true };
    var words = q.split(' ').filter(function (word) { return word.length > 2 && !stopwords[word]; });
    var score = q.length > 10 && t.indexOf(q) >= 0 ? 5 : 0;
    words.forEach(function (word) {
      if (t.indexOf(word) >= 0) score += 1;
    });
    return score;
  }

  function relevantFacts(query) {
    return buildCorpus()
      .map(function (text) { return { text: text, score: keywordScore(query, text) }; })
      .sort(function (a, b) { return b.score - a.score; })
      .filter(function (item, index) { return item.score > 0 || index < 4; })
      .slice(0, 8)
      .map(function (item) { return item.text; });
  }

  function fallbackReply(question) {
    var lower = normalizeText(question).toLowerCase();
    if (lower.indexOf('meeting') >= 0 || lower.indexOf('meet') >= 0 || lower.indexOf('where') >= 0) {
      return 'The Winchester club meets Wednesdays at noon at the Winchester Moose Club, 215 E. Cork St. Guests are welcome, so visiting a meeting is a good first step.';
    }
    if (lower.indexOf('join') >= 0 || lower.indexOf('member') >= 0 || lower.indexOf('volunteer') >= 0) {
      return 'To get involved, visit a Wednesday noon meeting or email pres@winvakiw.org. Online applications and dues payment are not currently published on the site, so leadership can provide the current membership steps.';
    }
    if (lower.indexOf('grant') >= 0 || lower.indexOf('donat') >= 0 || lower.indexOf('foundation') >= 0 || lower.indexOf('memorial') >= 0 || lower.indexOf('support request') >= 0) {
      return 'For grants, donations, memorial gifts, or foundation questions, email sec@winvakiw.org with your organization or gift details, timeline, and the community impact. The Resources page has the clearest checklist.';
    }
    if (lower.indexOf('pancake') >= 0 || lower.indexOf('ticket') >= 0) {
      return 'Pancake Day is the club’s annual fundraiser at Jim Barnett Park War Memorial Building. The April 25, 2026 event has concluded; check back for the next date or ask the club about volunteering.';
    }
    if (lower.indexOf('youth') >= 0 || lower.indexOf('key club') >= 0 || lower.indexOf('builder') >= 0) {
      return 'Winchester Kiwanis supports youth leadership through Key Clubs, Builder’s Clubs, Circle K, and scholarships for outstanding Key Club members.';
    }
    return 'Winchester Kiwanis is a volunteer service club focused on children, youth leadership, families, and community service. Ask me about meetings, joining, community support requests, donations, youth programs, history, or contact info.';
  }

  function createWidget() {
    if (document.getElementById('kw-chat-launcher')) return;

    var launcher = document.createElement('button');
    launcher.id = 'kw-chat-launcher';
    launcher.className = 'kw-chat-launcher';
    launcher.type = 'button';
    launcher.setAttribute('aria-label', 'Open Kiwanis assistant');
    launcher.innerHTML = '<span class="kw-launcher-emblem" aria-hidden="true"><img src="assets/uploads/2023/03/kiwanis-seal.png" alt="" width="38" height="38"></span><strong>Ask Kiwanis</strong>';

    var panel = document.createElement('section');
    panel.id = 'kw-chat-panel';
    panel.className = 'kw-chat-panel';
    panel.setAttribute('aria-label', 'Kiwanis assistant');
    panel.innerHTML = [
      '<div class="kw-chat-header">',
      '  <div><strong>Kiwanis Assistant</strong><small>Winchester club guide</small></div>',
      '  <button id="kw-chat-close" type="button" aria-label="Close Kiwanis assistant">x</button>',
      '</div>',
      '<div class="kw-chat-body">',
      '  <div id="kw-chat-status" class="kw-chat-status">Ask about meetings, joining, grants, donations, youth clubs, or service projects.</div>',
      '  <div id="kw-chat-messages" class="kw-chat-messages" aria-live="polite"></div>',
      '  <form id="kw-chat-form" class="kw-chat-form">',
      '    <label class="sr-only" for="kw-chat-input">Ask the Kiwanis assistant</label>',
      '    <input id="kw-chat-input" type="text" autocomplete="off" placeholder="Ask about Winchester Kiwanis...">',
      '    <button type="submit">Send</button>',
      '  </form>',
      '  <p class="kw-chat-hint">Answers are grounded in the Winchester Kiwanis site and Kiwanis service mission.</p>',
      '</div>'
    ].join('');

    document.body.appendChild(launcher);
    document.body.appendChild(panel);
  }

  function els() {
    return {
      launcher: document.getElementById('kw-chat-launcher'),
      panel: document.getElementById('kw-chat-panel'),
      close: document.getElementById('kw-chat-close'),
      status: document.getElementById('kw-chat-status'),
      messages: document.getElementById('kw-chat-messages'),
      form: document.getElementById('kw-chat-form'),
      input: document.getElementById('kw-chat-input')
    };
  }

  function openPanel() {
    var e = els();
    if (!e.panel) return;
    e.panel.classList.add('open');
    if (e.launcher) e.launcher.setAttribute('aria-expanded', 'true');
    setTimeout(function () { if (e.input) e.input.focus(); }, 80);
  }

  function closePanel() {
    var e = els();
    if (!e.panel) return;
    e.panel.classList.remove('open');
    if (e.launcher) e.launcher.setAttribute('aria-expanded', 'false');
  }

  function setStatus(text) {
    var e = els();
    if (e.status) e.status.textContent = text;
  }

  function appendMessage(role, text, extraClass) {
    var e = els();
    if (!e.messages) return null;
    var bubble = document.createElement('div');
    bubble.className = 'kw-chat-msg ' + role + (extraClass ? ' ' + extraClass : '');
    bubble.textContent = text;
    e.messages.appendChild(bubble);
    e.messages.scrollTop = e.messages.scrollHeight;
    return bubble;
  }

  function thinkingBubble() {
    var bubble = appendMessage('assistant', 'Thinking...', 'thinking');
    return bubble;
  }

  async function askAssistant(question) {
    var response = await fetch('/api/kiwanis-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: question,
        relevantFacts: relevantFacts(question),
        sessionId: getSessionId()
      })
    });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok || !payload.reply) throw new Error(payload.error || 'Assistant unavailable');
    return normalizeText(payload.reply);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    var e = els();
    var question = normalizeText(e.input && e.input.value);
    if (!question) return;
    appendMessage('user', question);
    e.input.value = '';
    var submit = e.form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    setStatus('Working on an answer...');
    var thinking = thinkingBubble();
    try {
      var reply;
      try {
        reply = await askAssistant(question);
      } catch (error) {
        reply = fallbackReply(question);
      }
      if (thinking && thinking.parentNode) thinking.remove();
      appendMessage('assistant', reply);
      setStatus('Ready for the next question.');
    } catch (error) {
      if (thinking && thinking.parentNode) thinking.remove();
      appendMessage('assistant', 'I hit a temporary issue. Please try again in a moment.');
      setStatus('Temporary assistant issue.');
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  function init() {
    createWidget();
    var e = els();
    if (!e.launcher || !e.panel || !e.form) return;
    e.launcher.setAttribute('aria-expanded', 'false');
    e.launcher.addEventListener('click', function () {
      if (e.panel.classList.contains('open')) closePanel();
      else openPanel();
    });
    if (e.close) e.close.addEventListener('click', closePanel);
    e.form.addEventListener('submit', handleSubmit);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closePanel();
    });
    appendMessage('assistant', 'Hi, I can help with Winchester Kiwanis. Ask me about meetings, joining, grants, donations, youth programs, history, or contact info.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
