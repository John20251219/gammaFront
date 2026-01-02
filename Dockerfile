# === 第一阶段：Node 构建 ===
FROM node:18-alpine AS builder
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