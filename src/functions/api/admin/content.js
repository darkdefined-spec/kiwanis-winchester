import { ADMIN_CONTENT_FILES, json, listFileCommits, readGithubFile, requireAdmin } from '../../_lib/editor-utils.js';

export async function onRequestGet({ request, env }) {
  try {
    await requireAdmin(request, env);
    const url = new URL(request.url);
    const requestedFile = url.searchParams.get('file');
    const files = requestedFile
      ? ADMIN_CONTENT_FILES.filter((file) => file.id === requestedFile)
      : ADMIN_CONTENT_FILES;

    if (requestedFile && !files.length) return json({ error: 'Unknown admin content file.' }, 404);

    const entries = await Promise.all(files.map(async (file) => {
      const source = await readGithubFile(env, file.path);
      const history = await listFileCommits(env, file.path, 5).catch(() => []);
      return {
        ...file,
        sha: source.sha,
        content: JSON.parse(source.text),
        history,
      };
    }));

    return json({
      ok: true,
      files: ADMIN_CONTENT_FILES,
      entries,
    });
  } catch (error) {
    const status = error.message === 'Missing editor session.' ? 401 : error.message === 'Admin access is required.' ? 403 : 500;
    return json({ error: error.message || 'Unable to load admin content.' }, status);
  }
}
