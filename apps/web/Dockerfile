FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_WS_URL=ws://localhost:3000
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

COPY package.json package-lock.json turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json

RUN npm ci

COPY . .

RUN npm run build --workspace @taskflow/types
RUN npm run build --workspace @taskflow/web

FROM nginx:1.27-alpine AS runner

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
