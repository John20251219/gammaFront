// src/pages/Login.jsx
import React, { useState } from 'react';
import md5 from 'crypto-js/md5';
import { Form, Input, Button, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined, GlobalOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authService } from '../utils/auth';
import CommonFooter from '../components/CommonFooter'; // 引入页脚
import './Login.css';
import fireBg from '../assets/backimage.png';

const Login = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values) => {
        setLoading(true);
        const md5Password = md5(values.password+"gammaSecret").toString();
        const result = await authService.login(values.username, md5Password);
        setLoading(false);
        if (result.success) {
            message.success('Welcome back!');
            navigate('/dashboard');
        } else {
            message.error(result.message);
        }
    };

    return (
        <div className="login-container">
            {/* 左侧保持不变 */}
            <div
                className="login-left"
                style={{ backgroundImage: `url(${fireBg})` }}
            >
                <div className="login-left-content">
                    <div className="brand-logo">
                        <GlobalOutlined style={{ fontSize: 28 }} />
                        <span>GAMMA后台管理系统</span>
                    </div>
                    <div className="brand-slogan">
                        <h1>智慧消防<br />守护城市安全</h1>
                        <p>
                            Smart Fire Safety & Emergency Response System.
                            <br />
                            全天候监测 · 极速响应 · 智能决策
                        </p>
                    </div>
                    <div style={{ opacity: 0.6, fontSize: 12 }}>
                        {/* 左侧也可以放一个小版权，或者留空 */}
                    </div>
                </div>
            </div>

            {/* 右侧：结构微调 */}
            <div className="login-right">
                {/* 这个空的 div 用来占位，把中间的内容挤到中间 */}
                <div style={{ flex: 1 }}></div>

                {/* 核心表单区域 */}
                <div className="login-form-wrapper">
                    <div className="form-header">
                        <h2>欢迎回来</h2>
                        <p>请输入用户名密码登录</p>
                    </div>

                    <Form
                        name="login_form"
                        className="login-form"
                        initialValues={{ remember: true }}
                        onFinish={onFinish}
                        layout="vertical"
                        size="large"
                    >
                        {/* ... Input 表单项代码保持不变 ... */}
                        <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                            <Input prefix={<UserOutlined />} placeholder="请输入登录名" />
                        </Form.Item>
                        <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading} block>登录</Button>
                        </Form.Item>
                    </Form>
                </div>

                {/* 底部页脚：使用 flex 布局将其推到底部 */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
                    <CommonFooter style={{ paddingBottom: 20 }} />
                </div>
            </div>
        </div>
    );
};

export default Login;