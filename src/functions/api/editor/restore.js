import {
  CONTENT_PATH,
  json,
  readGithubFile,
  readGithubFileAtRef,
  requireEditor,
  validateContent,
  writeGithubFile,
} from '../../_lib/editor-utils.js';

export async function onRequestPost({ request, env }) {
  try {
    const editor = await requireEditor(request, env);
    const body = await request.json();
    const commitSha = String(body.commitSha || '').trim();
    if (!commitSha) return json({ error: 'Commit SHA is required.' }, 400);

    const previous = await readGithubFileAtRef(env, CONTENT_PATH, commitSha);
    const content = validateContent(JSON.parse(previous.text));
    const latest = await readGithubFile(env, CONTENT_PATH);
    const text = `${JSON.stringify(content, null, 2)}\n`;
    const message = `Editor restore: events, newsletters, and speakers to ${commitSha.slice(0, 7)} (${editor.email})`;
    const result = await writeGithubFile(env, CONTENT_PATH, text, message, latest.sha);

    return json({
      ok: true,
      restoredFrom: commitSha,
      commit: {
        sha: result.commit?.sha || '',
        url: result.commit?.html_url || '',
      },
    });
  } catch (error) {
    return json({ error: error.message || 'Unable to restore editor content.' }, 500);
  }
}
