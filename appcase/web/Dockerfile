# node:24-alpine 은 linux/amd64·arm64 multi-arch 이미지 — 플랫폼 고정 없음
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json server.js ./
# FILES_DIR 기본값 /data — 비루트 사용자(node)가 쓸 수 있게 미리 만들어 둔다
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8080
CMD ["node", "server.js"]
