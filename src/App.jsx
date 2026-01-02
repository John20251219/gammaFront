import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ChangePassword from './pages/ChangePassword';
import SuperAdminUserList from './pages/SuperAdminUserList.jsx'; // 导入用户列表
import TaskList from './pages/TaskList'; // 导入任务列表
import PrivateRoute from './components/PrivateRoute';
import UserList from "./pages/UserList.jsx";

const HomeWelcome = () => (
    <div style={{ textAlign: 'center', padding: 50 }}>
        <h1>欢迎进入管理系统</h1>
        <p>请点击左侧菜单进行操作</p>
    </div>
);

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />

                {/* 主路由 */}
                <Route path="/dashboard" element={
                    <PrivateRoute>
                        <Dashboard />
                    </PrivateRoute>
                }>
                    {/* 默认显示的欢迎页 */}
                    <Route index element={<HomeWelcome />} />

                    {/* 新增的两个子路由 */}
                    <Route path="users" element={<UserList />} />
                    <Route path="tasks" element={<TaskList />} />

                    <Route path="change-password" element={<ChangePassword />} />
                </Route>

                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;