import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Overview from './pages/Overview';
import ChangePassword from './pages/ChangePassword';
import TaskList from './pages/TaskList';
import PrivateRoute from './components/PrivateRoute';
import UserList from "./pages/UserList.jsx";
import StandardLibrary from './pages/StandardLibrary';

/** 全局中文：按钮「确认/取消」、分页「x /页」等 */
const antdLocale = {
    ...zhCN,
    Modal: { ...zhCN.Modal, okText: '确认', cancelText: '取消' },
    Popconfirm: { ...zhCN.Popconfirm, okText: '确认', cancelText: '取消' },
    Pagination: {
        ...zhCN.Pagination,
        items_per_page: '/页',
    },
};

function App() {
    return (
        <ConfigProvider locale={antdLocale}>
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />

                {/* 主路由 */}
                <Route path="/dashboard" element={
                    <PrivateRoute>
                        <Dashboard />
                    </PrivateRoute>
                }>
                    {/* 主页概览 */}
                    <Route index element={<Overview />} />

                    {/* 新增的两个子路由 */}
                    <Route path="users" element={<UserList />} />
                    <Route path="standards" element={<StandardLibrary />} />
                    <Route path="tasks" element={<TaskList />} />

                    <Route path="change-password" element={<ChangePassword />} />
                </Route>

                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </BrowserRouter>
        </ConfigProvider>
    );
}

export default App;