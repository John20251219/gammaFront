// src/utils/request.js
import axios from 'axios';
import { message } from 'antd';

/**
 * 接口根地址（不含末尾 /）。
 * - 开发：默认 http://localhost:8080，可在 .env.development 里设 VITE_API_BASE_URL 覆盖。
 * - 生产：默认空字符串，请求走当前站点同源路径 /api，由 nginx 反代到后端（见 nginx.conf）。
 * - 若前后端不同域：在 .env.production 中设置 VITE_API_BASE_URL=https://你的-api域名
 */
const fromEnv = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL =
    fromEnv !== undefined && fromEnv !== null && String(fromEnv).trim() !== ''
        ? String(fromEnv).trim().replace(/\/+$/, '')
        : import.meta.env.DEV
            ? 'http://localhost:8080'
            : '';

// 创建 axios 实例
const service = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000 // 模板导入可能略慢，适当放宽
});

// 1. 请求拦截器：每次请求都在 Header 里带上 Token
service.interceptors.request.use(
    config => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            //通常后端要求 Header 格式为 Authorization: Bearer <token>
            config.headers['Authorization'] = 'Bearer ' + token;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// 2. 响应拦截器：统一处理报错、Token 过期
service.interceptors.response.use(
    response => {
        // 如果后端返回的 code 不是 200，说明业务逻辑错误
        const res = response.data;
        if (res.code !== 200) {
            message.error(res.message || 'Error');
            return Promise.reject(new Error(res.message || 'Error'));
        }
        return res;
    },
    error => {
        // === 关键点：处理 Token 过期 ===
        if (error.response && error.response.status === 401) {
            message.error('登录已过期，请重新登录');
            // 清除本地缓存
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_info');
            // 强制跳转回登录页
            window.location.href = '/login';
        } else {
            message.error(error.message || '网络异常');
        }
        return Promise.reject(error);
    }
);

export default service;