import {
  getAdminContentFile,
  json,
  readGithubFile,
  readGithubFileAtRef,
  requireAdmin,
  validateAdminContent,
  writeGithubFile,
} from '../../_lib/editor-utils.js';

export async function onRequestPost({ request, env }) {
  try {
    const admin = await requireAdmin(request, env);
    const body = await request.json();
    const file = getAdminContentFile(body.file);
    const commitSha = String(body.commitSha || '').trim();
    if (!file) return json({ error: 'Unknown admin content file.' }, 404);
    if (!commitSha) return json({ error: 'Commit SHA is required.' }, 400);

    const previous = await readGithubFileAtRef(env, file.path, commitSha);
    const content = validateAdminContent(JSON.parse(previous.text));
    const latest = await readGithubFile(env, file.path);
    const text = `${JSON.stringify(content, null, 2)}\n`;
    const message = `Admin restore: ${file.label} to ${commitSha.slice(0, 7)} (${admin.email})`;
    const result = await writeGithubFile(env, file.path, text, message, latest.sha);

    return json({
      ok: true,
      file,
      restoredFrom: commitSha,
      commit: {
        sha: result.commit?.sha || '',
        url: result.commit?.html_url || '',
      },
    });
  } catch (error) {
    const status = error.message === 'Missing editor session.' ? 401 : error.message === 'Admin access is required.' ? 403 : 500;
    return json({ error: error.message || 'Unable to restore admin content.' }, status);
  }
}
