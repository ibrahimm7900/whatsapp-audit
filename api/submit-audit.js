// api/submit-audit.js — same-origin proxy to the Kapso workflow trigger.
//
// Why this exists: the browser cannot POST directly to api.kapso.ai — that
// endpoint returns no Access-Control-Allow-Origin, so the cross-origin request
// is blocked by CORS before it's even sent. That silently killed both report
// delivery AND the Meta `Lead` conversion (the fetch rejected → catch block).
//
// This function runs server-side on Vercel (no CORS there), forwards the audit
// payload to Kapso, and returns the real status so the client can read res.ok
// and fire the conversion only on a genuine success.

const KAPSO_URL =
  'https://api.kapso.ai/platform/v1/workflows/59e4a70f-cf3b-4b3a-9ee3-31fbf319d803/executions';

// Public workflow-trigger key (same value that was already shipped in client JS).
// Prefer the Vercel env var if set; fall back to the known public key.
const KAPSO_KEY =
  process.env.KAPSO_PUBLIC_KEY ||
  '58f988d84e4310ceb5eb3202457289824e662cc40a03f37d0a913de290982c5b';

function readRaw(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', (c) => { d += c; });
    req.on('end', () => resolve(d));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    // @vercel/node usually parses JSON into req.body; fall back to raw stream.
    let payload = req.body;
    if (payload === undefined || payload === null || typeof payload === 'string') {
      const raw = typeof payload === 'string' ? payload : await readRaw(req);
      payload = raw ? JSON.parse(raw) : {};
    }

    const kres = await fetch(KAPSO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': KAPSO_KEY },
      body: JSON.stringify(payload),
    });

    const text = await kres.text();
    res.setHeader('Content-Type', 'application/json');
    res.status(kres.status).send(text || '{}');
  } catch (err) {
    res.status(502).json({ error: 'proxy_failed', detail: String((err && err.message) || err) });
  }
};
