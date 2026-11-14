// appcase/worker — 주소 없는 상시 실행. 30초마다 tick 로그 한 줄, 종료 신호에 깔끔히 끝남.
const VERSION = process.env.VERSION || process.env.GIT_COMMIT || process.env.SOURCE_COMMIT || 'unknown';
const INTERVAL_MS = 30_000;

const tick = () => console.log(`tick ${new Date().toISOString()} ${VERSION}`);

console.log(`appcase-worker started version=${VERSION} interval=${INTERVAL_MS / 1000}s`);
tick();
const timer = setInterval(tick, INTERVAL_MS);

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    clearInterval(timer);
    console.log(`${sig} received, worker stopped`);
    process.exit(0);
  });
}
