import { codeHash, getRoleForEmail, isAllowedEmail, json, normalizeEmail, signPayload, verifySignedPayload } from '../../_lib/editor-utils.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const code = String(body.code || '').trim();
    const challenge = String(body.challenge || '').trim();
    if (!email || !code || !challenge) return json({ error: 'Email, code, and challenge are required.' }, 400);
    if (!isAllowedEmail(email, env)) return json({ error: 'Editor is not authorized.' }, 403);

    const payload = await verifySignedPayload(challenge, env);
    if (normalizeEmail(payload.email) !== email) return json({ error: 'Code does not match this email.' }, 400);
    if (payload.codeHash !== await codeHash(email, code, env)) return json({ error: 'Invalid code.' }, 401);

    const role = getRoleForEmail(email, env) || 'editor';
    const hours = Math.max(1, Math.min(24, Number(env.EDITOR_SESSION_HOURS || 8)));
    const token = await signPayload({
      email,
      role,
      exp: Date.now() + hours * 60 * 60 * 1000,
    }, env);

    return json({ ok: true, token, email, role, expiresInHours: hours });
  } catch (error) {
    return json({ error: error.message || 'Unable to verify editor code.' }, 401);
  }
}
