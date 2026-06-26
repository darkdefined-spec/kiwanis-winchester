import {
  getAdminContentFile,
  json,
  readGithubFile,
  requireAdmin,
  validateAdminContent,
  writeGithubFile,
} from '../../_lib/editor-utils.js';

export async function onRequestPost({ request, env }) {
  try {
    const admin = await requireAdmin(request, env);
    const body = await request.json();
    const file = getAdminContentFile(body.file);
    if (!file) return json({ error: 'Unknown admin content file.' }, 404);

    const content = validateAdminContent(body.content);
    const latest = await readGithubFile(env, file.path);
    const text = `${JSON.stringify(content, null, 2)}\n`;
    const message = `Admin update: ${file.label} (${admin.email})`;
    const result = await writeGithubFile(env, file.path, text, message, latest.sha);

    return json({
      ok: true,
      file,
      commit: {
        sha: result.commit?.sha || '',
        url: result.commit?.html_url || '',
      },
    });
  } catch (error) {
    const status = error.message === 'Missing editor session.' ? 401 : error.message === 'Admin access is required.' ? 403 : 500;
    return json({ error: error.message || 'Unable to save admin content.' }, status);
  }
}
