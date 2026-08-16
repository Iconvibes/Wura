// One-off: validate the JSON-LD the prerender emits (what Google's crawler
// sees) against Google's Schema Markup Validator (validator.schema.org).
// Posts code-mode requests (form-encoded `html=`) like the validator's own
// frontend, with pacing + backoff for the validator's rate limiter.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const BASE = process.env.SITE || 'http://127.0.0.1:5000';
const pages = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['/', '/rooms', '/rooms/Deluxe%20King', '/rooms/Observatory%20Penthouse', '/about', '/contact', '/experience', '/gallery', '/stories'];

async function validateOnce(wrapped) {
  const vr = await fetch('https://validator.schema.org/validate', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'accept': 'application/json' },
    body: new URLSearchParams({ html: wrapped }).toString(),
  });
  const raw = await vr.text();
  if (!vr.ok) return { status: vr.status, error: raw.slice(0, 120) };
  if (!raw.trim().startsWith(')]}')) return { status: vr.status, error: 'unexpected body: ' + raw.slice(0, 120) };
  return { status: vr.status, json: JSON.parse(raw.replace(/^\)\]\}'\s*/, '')) };
}

for (const page of pages) {
  const res = await fetch(BASE + page, { headers: { 'user-agent': UA } });
  const html = await res.text();
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const wrapped = '<!doctype html><html><head>' + blocks.map((b) => '<script type="application/ld+json">' + b + '</script>').join('') + '</head><body></body></html>';

  let out = null;
  for (let t = 0; t < 5 && !out; t++) {
    out = await validateOnce(wrapped);
    if (out.json) break;
    console.log(`  (${page}) attempt ${t + 1}: HTTP ${out.status} ${out.error || ''} — backing off`);
    await sleep(20000 * (t + 1));
  }
  if (!out || !out.json) { console.log(`==== ${page}: FAILED after retries`); continue; }

  const j = out.json;
  console.log(`==== ${page} — ${blocks.length} block(s) | errors ${j.totalNumErrors} | warnings ${j.totalNumWarnings}`);
  for (const e of j.errors || []) {
    console.log(`  [${e.type}] ${e.message}${e.instancePath ? ` @ ${e.instancePath}` : ''}`);
  }
  await sleep(6000);
}
