// appcase/web — 경로 /, 포트 8080. 의존성 없는 Node 서버.
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PORT = Number(process.env.PORT ?? 8080);
const FILES_DIR = process.env.FILES_DIR || '/data';
const VERSION = process.env.VERSION || process.env.GIT_COMMIT || process.env.SOURCE_COMMIT || 'unknown';
const MAX_BODY = 1024 * 1024; // 1 MiB
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

// 이름만 — 값은 절대 응답에 넣지 않는다
function envNames() {
  return Object.keys(process.env)
    .filter((k) => k.startsWith('APP_') || k.startsWith('WINDPLATFORM_'))
    .sort();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        // 연결을 바로 끊으면 413 응답이 전달되지 않는다 — 응답을 보낸 뒤 닫는다
        req.removeAllListeners('data');
        req.resume();
        reject(Object.assign(new Error('body too large'), { status: 413 }));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function handle(req, res) {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');

  if (req.method === 'GET' && pathname === '/healthz') {
    return sendJson(res, 200, { ok: true, version: VERSION });
  }

  if (req.method === 'GET' && pathname === '/env') {
    return sendJson(res, 200, { names: envNames() });
  }

  if (pathname.startsWith('/files/')) {
    const name = decodeURIComponent(pathname.slice('/files/'.length));
    if (!NAME_RE.test(name) || name.includes('..')) {
      return sendJson(res, 400, { error: 'invalid file name (allowed: A-Z a-z 0-9 . _ -, up to 128 chars)' });
    }
    const target = join(FILES_DIR, name);

    if (req.method === 'POST') {
      const body = await readBody(req);
      await mkdir(FILES_DIR, { recursive: true });
      await writeFile(target, body);
      return sendJson(res, 201, { saved: name, bytes: body.length });
    }
    if (req.method === 'GET') {
      try {
        const data = await readFile(target);
        res.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': data.length });
        return res.end(data);
      } catch (err) {
        if (err.code === 'ENOENT') return sendJson(res, 404, { error: 'not found' });
        throw err;
      }
    }
    return sendJson(res, 405, { error: 'method not allowed' });
  }

  sendJson(res, 404, { error: 'not found' });
}

const server = createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error(`request failed: ${req.method} ${req.url} — ${err.message}`);
    if (!res.headersSent) {
      if (err.status === 413) {
        res.setHeader('connection', 'close');
        res.on('finish', () => req.destroy());
      }
      sendJson(res, err.status ?? 500, { error: err.status ? err.message : 'internal error' });
    } else res.end();
  });
});

server.listen(PORT, '0.0.0.0', () => console.log(`appcase-web listening on :${PORT} version=${VERSION} filesDir=${FILES_DIR}`));

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    console.log(`${sig} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
