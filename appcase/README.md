# appcase — 시험용 견본 앱

한 저장소(monorepo)에 구성 요소 셋. 폴더마다 Dockerfile 이 있고, 빌드 컨텍스트는 그 폴더 자체다
(naru 등록 시 `contextPath` = `appcase/web` · `appcase/api` · `appcase/worker`, `dockerfilePath` = `Dockerfile`).
셋 다 외부 의존성 없는 Node 24 (`node:24-alpine`, linux/amd64·arm64 multi-arch), 비루트 사용자 `node`, exec 형식 `CMD`, SIGTERM 처리.

## 구성 요소

| 구성 요소 | 폴더 / Dockerfile | 종류 | 경로 | 포트 | 헬스 체크 |
|---|---|---|---|---|---|
| web | `appcase/web/Dockerfile` | 웹 (UI 없는 HTTP) | `/` | 8080 | `GET /healthz` |
| api | `appcase/api/Dockerfile` | JSON API | `/api` | 3000 | `GET /api/healthz` |
| worker | `appcase/worker/Dockerfile` | 주소 없는 상시 실행 | — | — | 프로세스 생존 |

## 엔드포인트

**web** (`/`, 8080)

| 메서드 · 경로 | 응답 |
|---|---|
| `GET /healthz` | `200 {"ok":true,"version":"<VERSION>"}` |
| `GET /env` | `{"names":[...]}` — 이름이 `APP_` 또는 `WINDPLATFORM_` 로 시작하는 환경 변수의 **이름만** (값은 내지 않음) |
| `POST /files/<이름>` | 요청 본문을 `FILES_DIR/<이름>` 에 저장 → `201 {"saved","bytes"}` |
| `GET /files/<이름>` | 저장된 내용 (`application/octet-stream`), 없으면 404 |

파일 이름은 `A-Z a-z 0-9 . _ -` 최대 128자(첫 글자는 영숫자, `..` 불가), 본문은 최대 1 MiB(초과 시 413).

**api** (`/api`, 3000) — naru 는 pathPrefix 를 떼지 않으므로 라우트가 `/api` 를 포함한다.

| 메서드 · 경로 | 응답 |
|---|---|
| `GET /api/healthz` | `200 {"ok":true,"version":"<VERSION>"}` |
| `GET /api/time` | `{"iso":"...","epochMs":...}` |
| `GET /api/env` | web 의 `/env` 와 같은 규칙 (이름만) |

**worker** — 시작 시 한 번, 이후 30초마다 `tick <ISO 시각> <VERSION>` 한 줄을 stdout 에 남긴다. SIGTERM/SIGINT 에 타이머를 멈추고 exit 0.

## 환경 변수

| 이름 | 쓰는 곳 | 기본값 | 설명 |
|---|---|---|---|
| `VERSION` | web · api · worker | `GIT_COMMIT` → `SOURCE_COMMIT` → `unknown` | 헬스 응답·tick 로그에 나오는 버전. 이미지 안에는 `.git` 이 없으므로 커밋을 보이려면 배포 시 `VERSION`(또는 `GIT_COMMIT`)을 넣는다 |
| `FILES_DIR` | web | `/data` | `/files/*` 저장 폴더. 이미지에 `/data` 를 `node` 소유로 만들어 둠 |
| `PORT` | web · api | 8080 · 3000 | 로컬 실행용. naru 는 주입하지 않으므로 등록 포트를 위 값과 맞출 것 |
| `APP_*`, `WINDPLATFORM_*` | web · api | — | `/env`, `/api/env` 가 **이름만** 보여 줌 |

비밀 값은 소스·로그에 넣지 않는다. 환경 변수 값은 어떤 응답이나 로그에도 찍히지 않는다(`VERSION`·`FILES_DIR` 만 시작 로그에 나옴).

> 저장 주의: `/data` 는 컨테이너 안 임시 디스크라 재시작·재배포 시 사라진다. 남겨야 하면 naru 공유 볼륨을 `FILES_DIR` 경로에 붙인다 (`naru://workspaces/{workspaceId}/contracts/storage`).

## 로컬 실행

```bash
docker build -t appcase-web appcase/web && docker run --rm -p 8080:8080 appcase-web
docker build -t appcase-api appcase/api && docker run --rm -p 3000:3000 appcase-api
docker build -t appcase-worker appcase/worker && docker run --rm appcase-worker
# 또는 Node 만으로: (cd appcase/web && FILES_DIR=/tmp/appcase node server.js)
```
