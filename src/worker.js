// Cloudflare Worker sitting in front of the static site.
//
// Static assets are matched first (configured in wrangler.jsonc), so this Worker
// is only invoked for requests that DON'T map to a file in public/ — chiefly the
// POST /api/feedback endpoint. Everything else is handed back to the static asset
// handler via the ASSETS binding.
//
// The feedback endpoint sends the submission to feedback@goodstewardapps.com via
// Resend, so the website can email feedback consistently on any device without
// relying on the visitor's own mail client. The Resend API key is a Worker secret
// (RESEND_API_KEY) — never committed.

const FEEDBACK_TO = 'feedback@goodstewardapps.com';
const FEEDBACK_FROM = 'ScripturePicture <feedback@goodstewardapps.com>';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/feedback') {
      return handleFeedback(request, env);
    }
    // Not the API route — let the static asset handler serve it (incl. 404s).
    return env.ASSETS.fetch(request);
  },
};

async function handleFeedback(request, env) {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }

  const name = String(data.name ?? '').trim();
  const email = String(data.email ?? '').trim(); // optional
  const comment = String(data.comment ?? '').trim();
  const rating = Number.parseInt(data.rating, 10);
  const honeypot = String(data.company ?? '').trim(); // hidden field; only bots fill it

  // A filled honeypot means a bot — pretend success and send nothing.
  if (honeypot) return json({ ok: true });

  if (!name || !comment || !(rating >= 1 && rating <= 5)) {
    return json({ ok: false, error: 'Please add your name, rating and feedback.' }, 422);
  }
  if (name.length > 100 || email.length > 200 || comment.length > 5000) {
    return json({ ok: false, error: 'That submission is a little too long.' }, 422);
  }

  // The email is optional; only treat it as a reply address if it looks valid.
  const emailValid = email !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // RESEND_API_KEY is a Secrets Store binding (resolved via .get()), but tolerate
  // a plain-string secret too so the binding switch never leaves a broken window.
  const apiKey =
    env.RESEND_API_KEY && typeof env.RESEND_API_KEY.get === 'function'
      ? await env.RESEND_API_KEY.get()
      : env.RESEND_API_KEY;
  if (!apiKey) {
    return json({ ok: false, error: 'Feedback is not configured yet.' }, 500);
  }

  const text = [
    'ScripturePicture feedback',
    '',
    `Name: ${name}`,
    `Email: ${email || 'Not provided'}`,
    `Rating: ${rating} out of 5`,
    '',
    'Feedback / suggestion:',
    comment,
  ].join('\n');

  const payload = {
    from: FEEDBACK_FROM,
    to: [FEEDBACK_TO],
    subject: `ScripturePicture feedback - ${rating}/5`,
    text,
  };
  // If the visitor left a valid email, set it as reply-to so a reply reaches them.
  if (emailValid) payload.reply_to = email;

  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return json({ ok: false, error: 'Could not send right now.' }, 502);
  }

  if (!res.ok) {
    return json({ ok: false, error: 'Could not send right now.' }, 502);
  }
  return json({ ok: true });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
