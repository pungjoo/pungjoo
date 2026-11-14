// appcase/api — 경로 /api, 포트 3000. JSON API, 의존성 없음.
// naru 는 pathPrefix 를 떼지 않으므로 라우트에 /api 를 그대로 둔다.
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 3000);
const VERSION = process.env.VERSION || process.env.GIT_COMMIT || process.env.SOURCE_COMMIT || 'unknown';

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

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });

  switch (pathname) {
    case '/api/healthz':
      return sendJson(res, 200, { ok: true, version: VERSION });
    case '/api/time': {
      const now = new Date();
      return sendJson(res, 200, { iso: now.toISOString(), epochMs: now.getTime() });
    }
    case '/api/env':
      return sendJson(res, 200, { names: envNames() });
    default:
      return sendJson(res, 404, { error: 'not found' });
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`appcase-api listening on :${PORT} version=${VERSION}`));

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    console.log(`${sig} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
