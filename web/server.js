// 점심 메뉴 룰렛 — 외부 의존성 없는 Node 서버 (UI + /api 를 한 프로세스에서 제공)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomInt } from 'node:crypto';

const PORT = Number(process.env.PORT ?? 8080);

const MENUS = {
  한식: ['김치찌개', '된장찌개', '제육볶음', '비빔밥', '순두부찌개', '불고기 백반', '냉면', '칼국수', '감자탕', '돌솥비빔밥'],
  중식: ['짜장면', '짬뽕', '탕수육', '마파두부밥', '볶음밥', '깐풍기', '마라탕'],
  일식: ['돈카츠', '초밥', '라멘', '우동', '규동', '회덮밥', '오코노미야키'],
  양식: ['파스타', '피자', '햄버거', '리조또', '스테이크 덮밥', '샐러드볼'],
  분식: ['떡볶이', '김밥', '라볶이', '쫄면', '순대', '튀김 세트'],
  기타: ['쌀국수', '팟타이', '카레', '부리또', '포케', '반미'],
};

const ALL = Object.entries(MENUS).flatMap(([category, items]) => items.map((name) => ({ name, category })));

const indexHtml = await readFile(new URL('./public/index.html', import.meta.url));

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    return res.end('ok\n');
  }

  if (url.pathname === '/api/categories') {
    return sendJson(res, 200, { categories: Object.keys(MENUS) });
  }

  if (url.pathname === '/api/pick') {
    const wanted = url.searchParams.getAll('category').filter((c) => c in MENUS);
    const pool = wanted.length ? ALL.filter((m) => wanted.includes(m.category)) : ALL;
    const pick = pool[randomInt(pool.length)];
    return sendJson(res, 200, { pick, candidates: pool.length });
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(indexHtml);
  }

  sendJson(res, 404, { error: 'not found' });
});

server.listen(PORT, '0.0.0.0', () => console.log(`lunch-roulette listening on :${PORT}`));

// 롤아웃이 빨리 끝나도록 SIGTERM 을 직접 처리
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
