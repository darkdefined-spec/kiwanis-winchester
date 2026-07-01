import { CONTENT_PATH, json, readGithubFile } from '../_lib/editor-utils.js';

export async function onRequestGet({ env }) {
  try {
    const source = await readGithubFile(env, CONTENT_PATH);
    const content = JSON.parse(source.text);
    return json({ ok: true, content, sha: source.sha || '' });
  } catch (error) {
    return json({ error: error.message || 'Unable to load editor content.' }, 500);
  }
}
