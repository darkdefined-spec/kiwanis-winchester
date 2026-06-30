import { DEMO_LOGIN_CODE, DEMO_LOGIN_EMAIL, codeHash, isAllowedEmail, json, normalizeEmail, signPayload } from '../../_lib/editor-utils.js';

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtpEmail(env, email, code) {
  const resendKey = String(env.RESEND_API_KEY || '').trim();
  const from = String(env.EDITOR_EMAIL_FROM || 'Kiwanis Website <website@winvakiw.org>').trim();
  if (!resendKey) return { sent: false, reason: 'resend-not-configured' };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${resendKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Your Kiwanis editor code',
      text: [
        'Your Kiwanis editor portal code is:',
        '',
        code,
        '',
        'This code expires in 10 minutes. If you did not request it, you can ignore this email.',
      ].join('\n'),
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'Unable to send editor code.');
  }
  return { sent: true };
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    if (!email) return json({ error: 'Email is required.' }, 400);

    if (!isAllowedEmail(email, env)) {
      return json({ ok: true, message: 'If that email is approved, a code has been sent.' });
    }

    const code = email === DEMO_LOGIN_EMAIL ? DEMO_LOGIN_CODE : makeCode();
    const challenge = await signPayload({
      email,
      codeHash: await codeHash(email, code, env),
      exp: Date.now() + 10 * 60 * 1000,
      nonce: crypto.randomUUID(),
    }, env);

    const emailResult = email === DEMO_LOGIN_EMAIL
      ? { sent: true, demo: true }
      : await sendOtpEmail(env, email, code);
    if (!emailResult.sent && String(env.EDITOR_DEV_MODE || '') !== 'true') {
      throw new Error('Editor email delivery is not configured yet.');
    }
    return json({
      ok: true,
      challenge,
      message: email === DEMO_LOGIN_EMAIL ? 'Demo code ready.' : 'If that email is approved, a code has been sent.',
      ...((String(env.EDITOR_DEV_MODE || '') === 'true' || email === DEMO_LOGIN_EMAIL) ? { devCode: code } : {}),
    });
  } catch (error) {
    return json({ error: error.message || 'Unable to request editor code.' }, 500);
  }
}
