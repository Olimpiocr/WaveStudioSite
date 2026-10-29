// Servidor local para testar a versão final (pasta dist/) com os mesmos
// cabeçalhos de segurança e de cache que vão ser usados em produção.
// Sem dependências: node server.mjs  →  http://localhost:4321
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { brotliCompressSync, gzipSync, constants as z } from 'node:zlib';

const ROOT = resolve('dist');
const PORT = Number(process.env.PORT) || 4321;
const HOST = process.env.HOST || '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.webmanifest', '.xml', '.txt', '.svg']);

// Em localhost (http) não faz sentido HSTS nem upgrade-insecure-requests.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  'form-action https://api.whatsapp.com https://wa.me',
  "frame-ancestors 'none'",
].join('; ');

const SECURITY = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-DNS-Prefetch-Control': 'off',
};

const cache = new Map();

async function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p.endsWith('/')) p += 'index';
  const candidates = [p, `${p}.html`, join(p, 'index.html')];
  for (const c of candidates) {
    const full = normalize(join(ROOT, c));
    if (full !== ROOT && !full.startsWith(ROOT + sep)) return null; // bloqueia "../"
    try {
      const s = await stat(full);
      if (s.isFile()) return full;
    } catch {}
  }
  return null;
}

async function send(req, res, file, status = 200) {
  const ext = extname(file);
  const { mtimeMs } = await stat(file);
  let body = cache.get(file);
  if (!body || body.mtimeMs !== mtimeMs) {
    const raw = await readFile(file);
    body = { raw, mtimeMs };
    if (COMPRESSIBLE.has(ext)) {
      body.br = brotliCompressSync(raw, { params: { [z.BROTLI_PARAM_QUALITY]: 11 } });
      body.gz = gzipSync(raw, { level: 9 });
    }
    cache.set(file, body);
  }
  const accept = String(req.headers['accept-encoding'] || '');
  const headers = { ...SECURITY, 'Content-Type': TYPES[ext] || 'application/octet-stream', Vary: 'Accept-Encoding' };
  headers['Cache-Control'] = file.includes(`${sep}_astro${sep}`)
    ? 'public, max-age=31536000, immutable'
    : ext === '.html' ? 'no-cache' : 'public, max-age=3600';

  let out = body.raw;
  if (body.br && accept.includes('br')) { out = body.br; headers['Content-Encoding'] = 'br'; }
  else if (body.gz && accept.includes('gzip')) { out = body.gz; headers['Content-Encoding'] = 'gzip'; }
  headers['Content-Length'] = out.length;
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : out);
}

createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { ...SECURITY, Allow: 'GET, HEAD' });
      return res.end();
    }
    const file = await resolveFile(req.url || '/');
    if (file) return await send(req, res, file);
    const notFound = join(ROOT, '404.html');
    return await send(req, res, notFound, 404);
  } catch (err) {
    console.error(err);
    res.writeHead(500, SECURITY);
    res.end('Erro interno');
  }
}).listen(PORT, HOST, () => {
  console.log(`Wave Studio a correr em http://localhost:${PORT}`);
});
