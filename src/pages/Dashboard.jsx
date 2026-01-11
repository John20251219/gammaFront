import React, { useState } from 'react';
import {Layout, Button, Menu, theme, Avatar} from 'antd';
import {
    UserOutlined,
    OrderedListOutlined,
    HomeOutlined,
    LogoutOutlined,
    SettingOutlined, ReadOutlined
} from '@ant-design/icons';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { authService } from '../utils/auth';
import CommonFooter from '../components/CommonFooter';

const { Header, Content, Footer, Sider } = Layout;

// 辅助函数：快速生成菜单项
function getItem(label, key, icon, children) {
    return { key, icon, children, label };
}

const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation(); // 获取当前路径，用于高亮菜单
    const [collapsed, setCollapsed] = useState(false); // 控制侧边栏收缩


    const {
        token: { colorBgContainer },
    } = theme.useToken();

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    // 获取当前用户信息
    const user = authService.getUserInfo();
    const { role, groupId } = user;

    // 2. 定义完整的菜单结构
    const allMenuItems = [
        getItem('主页概览', '/dashboard', <HomeOutlined />),

        // === 重点：这一项需要权限控制 ===
        getItem('用户管理', '/dashboard/users', <UserOutlined />),

        getItem('维保标准库', '/dashboard/standards', <ReadOutlined />),
        getItem('任务管理', '/dashboard/tasks', <OrderedListOutlined />),
        getItem('系统设置', 'settings', <SettingOutlined />, [
            getItem('修改密码', '/dashboard/change-password'),
        ]),
    ];

    // 3. 过滤菜单
    const menuItems = allMenuItems.filter(item => {
        // 如果 key 是用户管理
        if (item.key === '/dashboard/users') {
            // 逻辑：
            // 1. 如果是超管 (SUPER_ADMIN) -> 显示
            // 2. 如果是管理员 (ADMIN) -> 显示 (因为管理员肯定有组，或者即便没组也能进去看看空状态)
            // 3. 如果是普通用户 (USER) -> 必须有 groupId 才显示

            if (role === 'SUPER_ADMIN') return true;
            if (role === 'ADMIN') return true;
            if (role === 'USER' && groupId) return true;
            // 其他情况 (未分组的 USER) -> 隐藏
            return false;
        }
        // 其他菜单默认都显示
        return true;
    });

    // 定义左侧菜单配置
    // const menuItems = [
    //     getItem('主页概览', '/dashboard', <HomeOutlined />),
    //     getItem('用户管理', '/dashboard/users', <UserOutlined />),
    //     getItem('任务管理', '/dashboard/tasks', <OrderedListOutlined />),
    //     // 也可以加个分割线或者分组
    //     getItem('系统设置', 'settings', <SettingOutlined />, [
    //         getItem('修改密码', '/dashboard/change-password'),
    //     ]),
    // ];

    // 菜单点击事件
    const onMenuClick = (e) => {
        navigate(e.key);
    };

    // 根据当前 URL 计算选中的菜单项
    // 如果路径是 /dashboard/users，key 就是 /dashboard/users
    // 注意：如果只是 /dashboard，需要精准匹配
    const selectedKey = location.pathname;
    // 计算展开的子菜单（如果选中了修改密码，自动展开系统设置）
    const openKeys = ['settings'];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* 顶部通栏 Header */}
            <Header style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                zIndex: 10,  // 确保阴影在侧边栏上面
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <div
                    style={{
                        color: 'white',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10 // 这里控制 Logo 和文字的间距
                    }}
                    onClick={() => navigate('/dashboard')}
                >
                    {/* 引用 public 下的图片 */}
                    <img
                        src="/company-logo.png"
                        alt="Logo"
                        style={{ height: 32, width: 'auto' }} // 高度固定，宽度自适应
                    />
                    <span>深圳伽玛消防后台管理系统</span>
                </div>

                {/* === 核心修改：右侧用户信息区 === */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>

                    {/* 用户信息块 */}
                    <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        {/* 1. 头像组件 */}
                        <Avatar
                            size="large"
                            // 如果有头像URL就显示图片，没有就显示 null
                            src={user.avatar || null}
                            // 如果 src 加载失败或为空，显示默认图标
                            icon={<UserOutlined />}
                            style={{ backgroundColor: '#87d068', marginRight: 10 }} // 给默认头像一个背景色
                        />

                        {/* 2. 昵称和角色 */}
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
              <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>
                {user.nickname || user.username}
              </span>
                            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px' }}>
                {user.role === 'SUPER_ADMIN' ? '超级管理员' :
                    user.role === 'ADMIN' ? '小组长' : '成员'}
              </span>
                        </div>
                    </div>

                    {/* 退出按钮 (用文字按钮或者图标按钮都可以) */}
                    <Button
                        type="primary"
                        danger
                        ghost // 幽灵模式(透明背景)
                        size="small"
                        icon={<LogoutOutlined />}
                        onClick={handleLogout}
                    >
                        退出
                    </Button>
                </div>
            </Header>

            {/* 下方主体区域：包含侧边栏和内容 */}
            <Layout>
                {/* 左侧侧边栏 */}
                <Sider
                    collapsible
                    collapsed={collapsed}
                    onCollapse={(value) => setCollapsed(value)}
                    width={220}
                    theme="dark"
                    style={{ background: '#001529' }}
                >
                    <Menu
                        theme="dark"
                        mode="inline"
                        selectedKeys={[selectedKey]}
                        defaultOpenKeys={openKeys}
                        style={{ height: '100%', borderRight: 0, padding: '10px 0' }}
                        items={menuItems}
                        onClick={onMenuClick}
                    />
                </Sider>

                {/* 右侧内容滚动区 */}
                <Layout style={{ padding: '0 24px 24px' ,marginLeft: 0 }}>

                    {/* 面包屑或顶部间距 */}
                    <div style={{ margin: '16px 0' }}></div>

                    <Content
                        style={{
                            padding: 24,
                            margin: 0,
                            minHeight: 280,
                            background: colorBgContainer,
                            borderRadius: 8,
                            overflow: 'initial' // 防止内容被剪裁
                        }}
                    >
                        <Outlet />
                    </Content>

                    {/* 页脚 */}
                    <CommonFooter />
                </Layout>
            </Layout>
        </Layout>
    );
};

export default Dashboard;