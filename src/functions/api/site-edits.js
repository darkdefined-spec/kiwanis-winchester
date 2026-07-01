import { json, readGithubFile } from '../_lib/editor-utils.js';

function normalizePath(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const path = normalizePath(url.searchParams.get('path') || '/');
    const source = await readGithubFile(env, 'src/_data/siteEdits.json');
    const content = JSON.parse(source.text);
    const entries = content.pages?.[path] || [];

    return json({
      ok: true,
      path,
      entries,
      sha: source.sha || '',
    });
  } catch (error) {
    return json({ error: error.message || 'Unable to load site edits.' }, 500);
  }
}
