# root 로 시작하지 않는 nginx 이미지 (uid 101, pid 는 /tmp, 기본 포트 8080)
# 플랫폼이 Linux capability 를 제거하므로 공식 nginx 이미지(root → chown → nginx 전환)는 기동 불가
FROM nginxinc/nginx-unprivileged:1.27-alpine

# 커스텀 설정으로 기본 설정 덮어쓰기
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 정적 페이지
COPY html/ /usr/share/nginx/html/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
