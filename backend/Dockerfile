# Node 22 LTS, 경량 이미지
FROM node:22-alpine

# 작업 디렉토리
WORKDIR /app

# 의존성 먼저 (캐싱 최적화)
COPY package*.json ./
RUN npm ci --omit=dev

# 소스 복사
COPY src ./src

# 포트 노출 (문서화 목적, 실제 바인딩은 docker run/compose에서)
EXPOSE 3000

# 비특권 사용자로 실행 (보안)
USER node

CMD ["node", "src/index.js"]
