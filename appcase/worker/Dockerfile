# node:24-alpine 은 linux/amd64·arm64 multi-arch 이미지 — 플랫폼 고정 없음
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json worker.js ./
USER node
CMD ["node", "worker.js"]
