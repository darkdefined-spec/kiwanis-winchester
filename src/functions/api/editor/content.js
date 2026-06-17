import { json, listContentCommits, readGithubFile, requireEditor } from '../../_lib/editor-utils.js';

export async function onRequestGet({ request, env }) {
  try {
    await requireEditor(request, env);
    const file = await readGithubFile(env);
    const content = JSON.parse(file.text);
    const history = await listContentCommits(env).catch(() => []);
    return json({ ok: true, content, history });
  } catch (error) {
    return json({ error: error.message || 'Unable to load editor content.' }, 500);
  }
}
