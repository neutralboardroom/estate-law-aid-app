'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 10000);
const ROOT = path.resolve(__dirname);
const VERSION = '1.3.4';
const SOURCE_SHA256 = '114ff2fee0d8709175a55cab31ac407d48b12525c855fd26b45d0a3e15c25923';
const CANONICAL_HOST = 'estatelawaid.com';

const MIME = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'application/javascript; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.xml':'application/xml; charset=utf-8', '.svg':'image/svg+xml',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.webp':'image/webp', '.ico':'image/x-icon', '.webmanifest':'application/manifest+json',
  '.txt':'text/plain; charset=utf-8', '.pdf':'application/pdf'
};

function headers(res, contentType, cacheControl='no-cache') {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}
function json(res, status, body) {
  const text = JSON.stringify(body);
  headers(res, 'application/json; charset=utf-8', 'no-store');
  res.statusCode = status;
  res.end(text);
}
function safeFile(urlPath) {
  let pathname;
  try { pathname = decodeURIComponent(urlPath.split('?')[0]); } catch { return null; }
  if (pathname.includes('\0')) return null;
  let rel = pathname.replace(/^\/+/, '');
  if (!rel) rel = 'index.html';
  let candidate = path.resolve(ROOT, rel);
  if (!candidate.startsWith(ROOT + path.sep) && candidate !== ROOT) return null;
  try {
    const st = fs.statSync(candidate);
    if (st.isDirectory()) candidate = path.join(candidate, 'index.html');
  } catch {
    if (!path.extname(candidate)) candidate = path.join(candidate, 'index.html');
  }
  if (!candidate.startsWith(ROOT + path.sep)) return null;
  return candidate;
}
function serve(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return json(res, 405, {ok:false,error:'method_not_allowed'});
  }
  const host = String(req.headers.host || '').split(':')[0].toLowerCase();
  if (host === `www.${CANONICAL_HOST}`) {
    res.statusCode = 308;
    res.setHeader('Location', `https://${CANONICAL_HOST}${req.url}`);
    return res.end();
  }
  if (req.url === '/health' || req.url === '/health/') {
    return json(res, 200, {
      ok:true, app:'Estate Law Aid', version:VERSION,
      canonicalDomain:`https://${CANONICAL_HOST}`,
      sourceArtifactSha256:SOURCE_SHA256,
      publicStaticLive:true,
      sensitiveTrafficApproved:false,
      liveClaims:false, liveBilling:false, liveUploads:false, externalAi:false
    });
  }
  if (req.url === '/livez' || req.url === '/livez/') {
    return json(res, 200, {ok:true,status:'alive',app:'Estate Law Aid',version:VERSION});
  }
  if (req.url.startsWith('/api/')) {
    return json(res, 503, {
      ok:false, state:'closed_by_design', version:VERSION,
      message:'This public launch does not accept sensitive submissions or activate live account, billing, upload, filing, or external-AI services.'
    });
  }
  const file = safeFile(req.url);
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    const custom404=path.join(ROOT,'404.html');
    headers(res, 'text/html; charset=utf-8', 'no-store');
    res.statusCode = 404;
    if (fs.existsSync(custom404)) return fs.createReadStream(custom404).pipe(res);
    return res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Page not found | Estate Law Aid</title></head><body><main><h1>Page not found</h1><p><a href="/">Return to Estate Law Aid</a></p></main></body></html>');
  }
  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const immutable = req.url.startsWith('/assets/') && /\?v=/.test(req.url);
  headers(res, type, immutable ? 'public, max-age=31536000, immutable' : (ext === '.html' ? 'no-cache' : 'public, max-age=3600'));
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).on('error', () => json(res,500,{ok:false,error:'read_error'})).pipe(res);
}
http.createServer(serve).listen(PORT, '0.0.0.0', () => {
  console.log(`Estate Law Aid v${VERSION} public runtime listening on ${PORT}`);
});
