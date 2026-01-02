// src/pages/ChangePassword.jsx
import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { authService } from '../utils/auth';

const ChangePassword = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    // const currentUser = authService.getCurrentUser();
    const currentUsername = authService.getUsername()

    const onFinish = async (values) => {
        if (values.newPassword !== values.confirmPassword) {
            message.error('两次输入的新密码不一致');
            return;
        }

        setLoading(true);
        const result = await authService.changePassword(currentUsername, values.oldPassword, values.newPassword);
        setLoading(false);

        if (result.success) {
            message.success('密码修改成功，请重新登录');
            authService.logout();
            navigate('/login');
        } else {
            message.error(result.message);
        }
    };

    return (
        <Card title="修改密码" bordered={false} style={{ maxWidth: 500, margin: '20px auto' }}>
            <Form layout="vertical" onFinish={onFinish}>
                <Form.Item
                    name="oldPassword"
                    label="旧密码"
                    rules={[{ required: true, message: '请输入旧密码' }]}
                >
                    <Input.Password />
                </Form.Item>

                <Form.Item
                    name="newPassword"
                    label="新密码"
                    rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少6位' }]}
                >
                    <Input.Password />
                </Form.Item>

                <Form.Item
                    name="confirmPassword"
                    label="确认新密码"
                    rules={[{ required: true, message: '请再次输入新密码' }]}
                >
                    <Input.Password />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        确认修改
                    </Button>
                    <Button style={{ marginLeft: 10 }} onClick={() => navigate('/dashboard')}>
                        返回主页
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
};

export default ChangePassword;