const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const COOKIE_NAME = 'aetherum_ddq_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function sha256(value) { return crypto.createHash('sha256').update(value, 'utf8').digest('hex'); }
function sign(value, secret) { return crypto.createHmac('sha256', secret).update(value, 'utf8').digest('base64url'); }
function timingSafeEqualHex(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}
function makeSession(secret) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = String(exp);
  return payload + '.' + sign(payload, secret);
}
function validSession(value, secret) {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 2) return false;
  const exp = Number(parts[0]);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = sign(parts[0], secret);
  if (parts[1].length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(parts[1], 'utf8'), Buffer.from(expected, 'utf8'));
}
function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  const match = raw.split(';').map(v => v.trim()).find(v => v.startsWith(name + '='));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}
function setSessionCookie(res, value) {
  res.setHeader('Set-Cookie', COOKIE_NAME + '=' + encodeURIComponent(value) + '; Max-Age=' + SESSION_TTL_SECONDS + '; Path=/ddq; HttpOnly; Secure; SameSite=Lax');
}
function loginPage(error) {
  const message = error ? '<div class="error">Access denied. Please verify the password.</div>' : '';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Aetherum — DDQ Access</title><style>' +
    '*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#050D1A;color:#EEF0F4;font-family:Arial,sans-serif}' +
    'body{display:flex;align-items:center;justify-content:center;padding:24px}.card{width:min(440px,100%);padding:36px;background:#0A1628;border:1px solid #1A3050;border-radius:10px;box-shadow:0 24px 80px rgba(0,0,0,.45)}' +
    '.brand{font-size:18px;font-weight:700;margin-bottom:28px}.brand span{color:#F7931A}.kicker{color:#F7931A;font-size:11px;letter-spacing:.18em;text-transform:uppercase;margin-bottom:10px}' +
    'h1{font-size:29px;font-weight:400;line-height:1.2;margin:0 0 10px}p{color:#A8B8D0;font-size:13px;line-height:1.7;margin:0 0 22px}' +
    '.row{display:flex;gap:8px}input{flex:1;min-width:0;background:#050D1A;color:#EEF0F4;border:1px solid #1E3A5F;border-radius:6px;padding:13px;font-size:14px}' +
    'button{background:#F7931A;color:#050D1A;border:0;border-radius:6px;padding:0 18px;font-weight:700;cursor:pointer}.error{color:#EF4444;font-size:12px;margin-top:12px}' +
    '.small{margin-top:20px;color:#6B7A96;font-size:11px}@media(max-width:520px){.row{flex-direction:column}button{height:44px}}' +
    '</style></head><body><main class="card"><div class="brand"><span>◆</span> Aetherum</div>' +
    '<div class="kicker">Due Diligence Questionnaire</div><h1>Authorized access only.</h1>' +
    '<p>Enter the access password provided by Aetherum to open the DDQ.</p>' +
    '<form method="post" action="/ddq" autocomplete="off"><div class="row">' +
    '<input name="password" type="password" placeholder="Access password" aria-label="Access password" autofocus required><button type="submit">Unlock</button></div>' +
    message + '</form><div class="small">This document is provided for authorized diligence review.</div></main></body></html>';
}

module.exports = async (req, res) => {
  const passwordHash = process.env.DDQ_ACCESS_PASSWORD_HASH;
  const sessionSecret = process.env.DDQ_SESSION_SECRET;
  if (!passwordHash || !sessionSecret) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('DDQ access is not configured. Set DDQ_ACCESS_PASSWORD_HASH and DDQ_SESSION_SECRET in Vercel.');
  }
  const session = getCookie(req, COOKIE_NAME);
  if (req.method === 'POST') {
    let password = '';
    if (typeof req.body === 'string') password = new URLSearchParams(req.body).get('password') || '';
    else if (req.body && typeof req.body === 'object') password = String(req.body.password || '');
    if (timingSafeEqualHex(sha256(password), passwordHash)) {
      setSessionCookie(res, makeSession(sessionSecret));
      res.statusCode = 303;
      res.setHeader('Location', '/ddq/');
      return res.end();
    }
    res.statusCode = 401;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store');
    return res.end(loginPage(true));
  }
  if (!validSession(session, sessionSecret)) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store');
    return res.end(loginPage(false));
  }
  const file = path.join(process.cwd(), 'ddq', 'index.html');
  const content = fs.readFileSync(file, 'utf8');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Cookie');
  return res.end(content);
};