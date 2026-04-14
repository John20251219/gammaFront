// src/utils/auth.js
import request from './request';

const TOKEN_KEY = 'auth_token';
const USER_INFO_KEY = 'user_info';

// 模拟延迟
export const authService = {
  // === 调用真实接口 ===
  login: async (username, password) => {
    try {
      // 发送 POST 请求
      const res = await request.post('/api/login', { username, password });

      // 假设后端返回结构是 { data: { token: '...', userInfo: {...} } }
      const { token, userInfo } = res.data;

      // 存 Token
      localStorage.setItem(TOKEN_KEY, token);
      // 存用户信息 (包含 role)
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));

      return { success: true };
    } catch (error) {
      return { success: false, message: error.message }; // 错误已经在 request.js 弹窗了，这里只需返回失败
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
  },

  isAuthenticated: () => {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  getCurrentUser: () => {
    const user = JSON.parse(localStorage.getItem(USER_INFO_KEY) || '{}');
    return user.nickname || user.username || 'Guest';
  },

  getUsername: () => {
    const user = JSON.parse(localStorage.getItem(USER_INFO_KEY) || '{}');
    return user.username; // 强制返回 username (例如 "admin")
  },

  // 获取完整用户信息对象
  getUserInfo: () => {
    return JSON.parse(localStorage.getItem(USER_INFO_KEY) || '{}');
  },

  // 获取当前用户的 GroupId
  getGroupId: () => {
    const user = JSON.parse(localStorage.getItem(USER_INFO_KEY) || '{}');
    return user.groupId;
  },

  // === 新增：获取用户角色 ===
  getUserRole: () => {
    const user = JSON.parse(localStorage.getItem(USER_INFO_KEY) || '{}');
    return user.role; // role 表主键 id（数字）
  },

  changePassword: async (username, oldPassword, newPassword) => {
    try {
      // 发送 POST 请求到后端
      // 注意：由于使用了 BCrypt，这里发送明文即可，HTTPS 会保护传输安全
      const res = await request.post('/api/changePassword', {
        username,
        oldPassword,
        newPassword
      });

      // 假设后端成功返回 200，request.js 拦截器会返回 res.data
      return { success: true };
    } catch (error) {
      // 如果后端报错（比如旧密码错误），request.js 会抛出异常
      // 我们捕获它并返回 success: false，以便页面显示错误提示
      return { success: false, message: error.message || '修改失败' };
    }
  },
};