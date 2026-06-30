const CONTENT_PATH = 'src/_data/editorContent.json';
const ASSET_ROOT = 'src/assets/uploads/editor';
const DEMO_LOGIN_EMAIL = 'demo@winvakiw.org';
const DEMO_LOGIN_CODE = '123456';
const ADMIN_CONTENT_FILES = [
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

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getAllowedEmailsForEnvValue(value) {
  return String(value || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);
}

function getAllowedEmails(env) {
  return [
    ...getAllowedEmailsForEnvValue(env.EDITOR_ALLOWED_EMAILS),
    ...getAllowedEmailsForEnvValue(env.ADMIN_ALLOWED_EMAILS || env.EDITOR_ADMIN_EMAILS),
  ].filter((email, index, list) => list.indexOf(email) === index);
}

function getAdminEmails(env) {
  return getAllowedEmailsForEnvValue(env.ADMIN_ALLOWED_EMAILS || env.EDITOR_ADMIN_EMAILS);
}

function isAllowedEmail(email, env) {
  if (normalizeEmail(email) === DEMO_LOGIN_EMAIL) return true;
  const allowed = getAllowedEmails(env);
  if (!allowed.length) return false;
  return allowed.includes(normalizeEmail(email));
}

function getRoleForEmail(email, env) {
  const normalized = normalizeEmail(email);
  if (normalized === DEMO_LOGIN_EMAIL) return 'admin';
  if (getAdminEmails(env).includes(normalized)) return 'admin';
  if (getAllowedEmailsForEnvValue(env.EDITOR_ALLOWED_EMAILS).includes(normalized)) return 'editor';
  return '';
}

function getSecret(env) {
  return String(env.EDITOR_AUTH_SECRET || '').trim();
}

function assertSecret(env) {
  if (!getSecret(env)) throw new Error('EDITOR_AUTH_SECRET is not configured.');
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(String(base64 || '').replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function textToBase64(text) {
  return bytesToBase64(new TextEncoder().encode(text));
}

function base64ToText(base64) {
  return new TextDecoder().decode(base64ToBytes(base64));
}

function base64UrlEncode(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  let base64 = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return base64ToBytes(base64);
}

async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return base64UrlEncode(new Uint8Array(digest));
}

async function hmac(text, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return base64UrlEncode(new Uint8Array(signature));
}

async function signPayload(payload, env) {
  assertSecret(env);
  const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmac(body, getSecret(env));
  return `${body}.${signature}`;
}

async function verifySignedPayload(token, env) {
  assertSecret(env);
  const [body, signature] = String(token || '').split('.');
  if (!body || !signature) throw new Error('Invalid token.');
  const expected = await hmac(body, getSecret(env));
  if (signature !== expected) throw new Error('Invalid token signature.');
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body)));
  if (payload.exp && Date.now() > payload.exp) throw new Error('Token expired.');
  return payload;
}

async function codeHash(email, code, env) {
  return sha256(`${normalizeEmail(email)}:${String(code || '').trim()}:${getSecret(env)}`);
}

function getGithubConfig(env) {
  const owner = String(env.GITHUB_OWNER || 'darkdefined-spec').trim();
  const repo = String(env.GITHUB_REPO || 'kiwanis-winchester').trim();
  const branch = String(env.GITHUB_BRANCH || 'main').trim();
  const token = String(env.GITHUB_TOKEN || env.GH_TOKEN || '').trim();
  if (!owner || !repo || !branch || !token) {
    throw new Error('GitHub editing is not configured. Set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, and GITHUB_BRANCH.');
  }
  return { owner, repo, branch, token };
}

async function githubFetch(env, pathname, options = {}) {
  const { owner, repo, token } = getGithubConfig(env);
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}${pathname}`, {
    ...options,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      'user-agent': 'kiwanis-editor-portal',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `GitHub request failed (${response.status}).`);
  }
  return payload;
}

async function readGithubFile(env, path = CONTENT_PATH) {
  const { branch } = getGithubConfig(env);
  const payload = await githubFetch(env, `/contents/${encodeURIComponentPath(path)}?ref=${encodeURIComponent(branch)}`);
  return {
    sha: payload.sha,
    text: base64ToText(payload.content || ''),
  };
}

async function readGithubFileAtRef(env, path = CONTENT_PATH, ref = '') {
  const cleanRef = String(ref || '').trim();
  if (!/^[a-f0-9]{7,40}$/i.test(cleanRef)) throw new Error('A valid commit SHA is required.');
  const payload = await githubFetch(env, `/contents/${encodeURIComponentPath(path)}?ref=${encodeURIComponent(cleanRef)}`);
  return {
    sha: payload.sha,
    text: base64ToText(payload.content || ''),
  };
}

async function writeGithubFile(env, path, text, message, sha = null) {
  return writeGithubBase64(env, path, textToBase64(text), message, sha);
}

async function writeGithubBase64(env, path, content, message, sha = null) {
  const { branch } = getGithubConfig(env);
  const committerName = String(env.EDITOR_COMMITTER_NAME || 'Kiwanis Editor Portal').trim();
  const committerEmail = String(env.EDITOR_COMMITTER_EMAIL || 'website-editor@winvakiw.org').trim();
  return githubFetch(env, `/contents/${encodeURIComponentPath(path)}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content,
      branch,
      ...(sha ? { sha } : {}),
      committer: {
        name: committerName,
        email: committerEmail,
      },
    }),
  });
}

async function listContentCommits(env) {
  const { branch } = getGithubConfig(env);
  const commits = await githubFetch(env, `/commits?sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(CONTENT_PATH)}&per_page=8`);
  return (Array.isArray(commits) ? commits : []).map((item) => ({
    sha: item.sha,
    message: item.commit?.message || '',
    date: item.commit?.committer?.date || item.commit?.author?.date || '',
    author: item.commit?.author?.name || item.author?.login || '',
    url: item.html_url || '',
  }));
}

async function listFileCommits(env, path, perPage = 8) {
  const { branch } = getGithubConfig(env);
  const commits = await githubFetch(env, `/commits?sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}&per_page=${Number(perPage) || 8}`);
  return (Array.isArray(commits) ? commits : []).map((item) => ({
    sha: item.sha,
    message: item.commit?.message || '',
    date: item.commit?.committer?.date || item.commit?.author?.date || '',
    author: item.commit?.author?.name || item.author?.login || '',
    url: item.html_url || '',
  }));
}

function getAdminContentFile(fileIdOrPath) {
  const value = String(fileIdOrPath || '').trim();
  return ADMIN_CONTENT_FILES.find((file) => file.id === value || file.path === value) || null;
}

function validateAdminContent(content) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    throw new Error('Admin content must be a JSON object.');
  }
  return JSON.parse(JSON.stringify(content));
}

function encodeURIComponentPath(path) {
  return String(path).split('/').map(encodeURIComponent).join('/');
}

function slugify(value) {
  return String(value || 'file')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'file';
}

function safeUploadPath(filename, kind = 'file') {
  const clean = slugify(filename);
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const stamp = now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const folder = kind === 'pdf' ? 'newsletters' : 'events';
  return `${ASSET_ROOT}/${folder}/${year}/${month}/${stamp}-${clean}`;
}

function validateContent(content) {
  if (!content || typeof content !== 'object') throw new Error('Content payload is invalid.');
  const events = Array.isArray(content.events) ? content.events : [];
  const newsletters = Array.isArray(content.newsletters) ? content.newsletters : [];
  const speakers = content.speakers && typeof content.speakers === 'object' ? content.speakers : {};

  return {
    events: events.slice(0, 50).map((event) => ({
      id: String(event.id || '').trim() || slugify(event.title || 'event'),
      title: String(event.title || '').trim(),
      date: String(event.date || '').trim(),
      category: String(event.category || '').trim(),
      eventMeta: String(event.eventMeta || '').trim(),
      headerColor: event.headerColor === 'gold' ? 'gold' : 'blue',
      facebookUrl: String(event.facebookUrl || '').trim(),
      photos: (Array.isArray(event.photos) ? event.photos : []).slice(0, 12).map((photo) => ({
        src: String(photo.src || '').trim(),
        alt: String(photo.alt || '').trim(),
        objectPosition: String(photo.objectPosition || 'center center').trim(),
      })).filter((photo) => photo.src),
    })).filter((event) => event.title && event.date),
    newsletters: newsletters.slice(0, 120).map((item) => ({
      id: String(item.id || '').trim() || slugify(item.title || 'newsletter'),
      title: String(item.title || '').trim(),
      date: String(item.date || '').trim(),
      year: String(item.year || item.date || '').slice(0, 4),
      pdfUrl: String(item.pdfUrl || '').trim(),
    })).filter((item) => item.title && item.date && item.pdfUrl),
    speakers: {
      intro: String(speakers.intro || '').trim(),
      upcoming: normalizeSpeakers(speakers.upcoming),
      recent: normalizeSpeakers(speakers.recent),
    },
  };
}

function normalizeSpeakers(items) {
  return (Array.isArray(items) ? items : []).slice(0, 40).map((item) => ({
    id: String(item.id || '').trim() || slugify(item.name || 'speaker'),
    date: String(item.date || '').trim(),
    name: String(item.name || '').trim(),
    organization: String(item.organization || '').trim(),
    topic: String(item.topic || '').trim(),
    title: String(item.title || '').trim(),
    meta: String(item.meta || '').trim(),
    description: String(item.description || '').trim(),
  })).filter((item) => item.date || item.name || item.topic || item.organization);
}

async function requireEditor(request, env) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) throw new Error('Missing editor session.');
  const payload = await verifySignedPayload(header.slice('Bearer '.length), env);
  const email = normalizeEmail(payload.email);
  if (!email || !isAllowedEmail(email, env)) throw new Error('Editor is not authorized.');
  return { email, role: getRoleForEmail(email, env) || payload.role || 'editor' };
}

async function requireAdmin(request, env) {
  const editor = await requireEditor(request, env);
  if (editor.role !== 'admin') throw new Error('Admin access is required.');
  return editor;
}

export {
  CONTENT_PATH,
  DEMO_LOGIN_CODE,
  DEMO_LOGIN_EMAIL,
  ADMIN_CONTENT_FILES,
  json,
  normalizeEmail,
  isAllowedEmail,
  getRoleForEmail,
  codeHash,
  signPayload,
  verifySignedPayload,
  requireEditor,
  requireAdmin,
  readGithubFile,
  readGithubFileAtRef,
  writeGithubFile,
  writeGithubBase64,
  listContentCommits,
  listFileCommits,
  getAdminContentFile,
  safeUploadPath,
  validateContent,
  validateAdminContent,
};
