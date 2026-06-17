import { json, requireEditor, safeUploadPath, writeGithubBase64 } from '../../_lib/editor-utils.js';

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf']);

function extension(filename) {
  return String(filename || '').split('.').pop().toLowerCase();
}

export async function onRequestPost({ request, env }) {
  try {
    const editor = await requireEditor(request, env);
    const body = await request.json();
    const filename = String(body.filename || '').trim();
    const contentBase64 = String(body.contentBase64 || '').trim();
    const kind = body.kind === 'pdf' ? 'pdf' : 'image';
    const ext = extension(filename);
    if (!filename || !contentBase64) return json({ error: 'File name and content are required.' }, 400);
    if (!ALLOWED_EXTENSIONS.has(ext)) return json({ error: 'Unsupported file type.' }, 400);
    if (kind === 'pdf' && ext !== 'pdf') return json({ error: 'Newsletter uploads must be PDFs.' }, 400);
    if (kind === 'image' && ext === 'pdf') return json({ error: 'Event photo uploads must be images.' }, 400);

    const path = safeUploadPath(filename, kind);
    const message = `Editor upload: ${filename} (${editor.email})`;
    const result = await writeGithubBase64(env, path, contentBase64.replace(/\s+/g, ''), message);
    const publicPath = `/${path.replace(/^src\//, '')}`;

    return json({
      ok: true,
      publicPath,
      commit: {
        sha: result.commit?.sha || '',
        url: result.commit?.html_url || '',
      },
    });
  } catch (error) {
    return json({ error: error.message || 'Unable to upload file.' }, 500);
  }
}
