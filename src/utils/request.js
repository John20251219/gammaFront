// src/utils/request.js
import axios from 'axios';
import { message } from 'antd';

// 创建 axios 实例
const service = axios.create({
    baseURL: 'http://localhost:8080', // 你的真实后端地址
    timeout: 5000 // 请求超时时间
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