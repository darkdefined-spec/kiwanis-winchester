import { CONTENT_PATH, json, readGithubFile, requireEditor, validateContent, writeGithubFile } from '../../_lib/editor-utils.js';

export async function onRequestPost({ request, env }) {
  try {
    const editor = await requireEditor(request, env);
    const body = await request.json();
    const content = validateContent(body.content);
    const latest = await readGithubFile(env, CONTENT_PATH);
    const text = `${JSON.stringify(content, null, 2)}\n`;
    const message = `Editor update: events, newsletters, and speakers (${editor.email})`;
    const result = await writeGithubFile(env, CONTENT_PATH, text, message, latest.sha);
    return json({
      ok: true,
      contentSha: result.content?.sha || '',
      commit: {
        sha: result.commit?.sha || '',
        url: result.commit?.html_url || '',
      },
    });
  } catch (error) {
    return json({ error: error.message || 'Unable to save editor content.' }, 500);
  }
}
