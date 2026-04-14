# === 第一阶段：Node 构建 ===
# Vite 7 需要 Node 20.19+ / 22.12+；构建上下文请使用 adminFront 目录（该目录内需含 package.json 与 src/）
FROM node:22-alpine AS builder
WORKDIR /web
COPY package*.json ./
# 安装依赖
RUN npm install --registry=https://registry.npmmirror.com
COPY . .
# 打包
RUN npm run build

# === 第二阶段：Nginx 运行 ===
FROM nginx:alpine
# 复制构建产物
COPY --from=builder /web/dist /usr/share/nginx/html
# 复制你的 nginx 配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80