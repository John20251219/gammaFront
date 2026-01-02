import React, { useState, useEffect } from 'react';
import {
    Table, Tag, Space, Button, Tabs, Card,
    List, Modal, Form, Input, message, Empty, Tooltip, Popconfirm, Select
} from 'antd';
import {
    UserOutlined, TeamOutlined, PlusOutlined,
    UserAddOutlined, CrownOutlined, LogoutOutlined,
    SearchOutlined, ReloadOutlined, EditOutlined
} from '@ant-design/icons';
import request from '../utils/request';
import { authService } from '../utils/auth';

const { Option } = Select;

// ===========================================================================
// 组件 A: 上帝视角 (SuperAdminView)
// 包含：全员列表、小组管理、新建小组、分配管理员等所有高级功能
// ===========================================================================
const SuperAdminView = () => {
    // === 基础状态 ===
    const [groups, setGroups] = useState([]);
    const [occupiedGroupIds, setOccupiedGroupIds] = useState([]);

    // === Tab 1: 全员列表 ===
    const [allUsers, setAllUsers] = useState([]);
    const [allTotal, setAllTotal] = useState(0);
    const [allPage, setAllPage] = useState(1);
    const [allPageSize, setAllPageSize] = useState(10);
    const [allLoading, setAllLoading] = useState(false);
    const [searchForm] = Form.useForm();

    // === Tab 2: 小组视图 ===
    const [groupUsers, setGroupUsers] = useState([]);
    const [groupTotal, setGroupTotal] = useState(0);
    const [groupPage, setGroupPage] = useState(1);
    const [groupPageSize, setGroupPageSize] = useState(5);
    const [groupLoading, setGroupLoading] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState(null);

    // === 其他状态 ===
    const [activeTab, setActiveTab] = useState('1');
    const [isModalOpen, setIsModalOpen] = useState(false); // 新建小组弹窗
    const [modalForm] = Form.useForm();

    // === 编辑用户弹窗 ===
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editForm] = Form.useForm();
    const currentEditRole = Form.useWatch('role', editForm);

    // === 添加成员弹窗 ===
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [unassignedUsers, setUnassignedUsers] = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [addMemberLoading, setAddMemberLoading] = useState(false);

    // 初始化
    useEffect(() => {
        fetchGroups();
        fetchOccupiedGroups();
    }, []);

    useEffect(() => {
        if (activeTab === '1') fetchAllUsers(allPage, allPageSize);
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === '2' && selectedGroupId) {
            fetchGroupUsers(selectedGroupId, groupPage, groupPageSize);
        }
    }, [activeTab, selectedGroupId]);

    // --- API 请求函数 ---
    const fetchGroups = async () => {
        const res = await request.get('/api/users/getGroups');
        if (res.code === 200) {
            setGroups(res.data);
            if (res.data.length > 0 && !selectedGroupId) setSelectedGroupId(res.data[0].id);
        }
    };

    const fetchOccupiedGroups = async () => {
        const res = await request.get('/api/users/groups/occupied');
        if (res.code === 200) setOccupiedGroupIds(res.data);
    };

    const fetchAllUsers = async (page, size) => {
        setAllLoading(true);
        try {
            const values = searchForm.getFieldsValue();
            const res = await request.get('/api/users/list', {
                params: {
                    pageNum: page, pageSize: size, excludeRole: 'SUPER_ADMIN',
                    username: values.username, nickname: values.nickname,
                    groupId: values.groupId, role: values.role
                }
            });
            if (res.code === 200) {
                setAllUsers(res.data.records);
                setAllTotal(res.data.total);
            }
        } finally {
            setAllLoading(false);
        }
    };

    const fetchGroupUsers = async (groupId, page, size) => {
        setGroupLoading(true);
        try {
            const res = await request.get('/api/users/list', {
                params: { pageNum: page, pageSize: size, groupId: groupId }
            });
            if (res.code === 200) {
                setGroupUsers(res.data.records);
                setGroupTotal(res.data.total);
            }
        } finally {
            setGroupLoading(false);
        }
    };

    const fetchUnassignedUsers = async () => {
        const res = await request.get('/api/users/unassigned');
        if (res.code === 200) setUnassignedUsers(res.data);
    };

    // --- 操作函数 ---
    const handleSearch = () => { setAllPage(1); fetchAllUsers(1, allPageSize); };
    const handleReset = () => { searchForm.resetFields(); setAllPage(1); fetchAllUsers(1, allPageSize); };

    const handleAddGroup = async (values) => {
        const res = await request.post('/api/users/getGroups', { name: values.groupName, description: values.description });
        if (res.code === 200) {
            message.success('创建成功');
            setIsModalOpen(false); modalForm.resetFields(); await fetchGroups();
        }
    };

    const handleEditClick = (record) => {
        setEditingUser(record);
        fetchOccupiedGroups();
        editForm.setFieldsValue(record);
        setIsEditModalOpen(true);
    };

    const handleUpdateUser = async () => {
        try {
            const values = await editForm.validateFields();
            const res = await request.put('/api/users/update', { id: editingUser.id, ...values });
            if (res.code === 200) {
                message.success('更新成功');
                setIsEditModalOpen(false);
                fetchAllUsers(allPage, allPageSize);
                fetchOccupiedGroups();
            }
        } catch (e) {}
    };

    const handleStatusChange = async (record) => {
        const newStatus = record.status === 1 ? 0 : 1;
        const res = await request.put(`/api/users/${record.id}/status/${newStatus}`);
        if (res.code === 200) {
            message.success('状态更新成功');
            fetchAllUsers(allPage, allPageSize);
            fetchOccupiedGroups();
        }
    };

    const openAddMemberModal = (e, group) => {
        e.stopPropagation();
        setSelectedGroupId(group.id);
        fetchUnassignedUsers();
        setSelectedUserIds([]);
        setIsAddMemberOpen(true);
    };

    const handleAddMembers = async () => {
        if (selectedUserIds.length === 0) return message.warning('请选择用户');
        setAddMemberLoading(true);
        try {
            const res = await request.post('/api/users/assign-group', { groupId: selectedGroupId, userIds: selectedUserIds });
            if (res.code === 200) {
                message.success('添加成功');
                setIsAddMemberOpen(false);
                fetchGroupUsers(selectedGroupId, groupPage, groupPageSize);
            }
        } finally { setAddMemberLoading(false); }
    };

    const handleChangeGroupRole = async (user, targetRole) => {
        const res = await request.put(`/api/users/${user.id}/change-role`, null, { params: { targetRole, groupId: selectedGroupId } });
        if (res.code === 200) {
            message.success('角色变更成功');
            fetchGroupUsers(selectedGroupId, groupPage, groupPageSize);
            fetchOccupiedGroups();
        }
    };

    const handleRemoveFromGroup = async (user) => {
        const res = await request.put(`/api/users/${user.id}/remove-group`);
        if (res.code === 200) {
            message.success('移出成功');
            fetchGroupUsers(selectedGroupId, groupPage, groupPageSize);
            fetchOccupiedGroups();
        }
    };

    // --- 列定义 ---
    const allColumns = [
        { title: '用户名', dataIndex: 'username', render: t => <Space><UserOutlined />{t}</Space> },
        { title: '昵称', dataIndex: 'nickname' },
        { title: '所属小组', dataIndex: 'groupId', render: gid => { const g = groups.find(i => i.id === gid); return g ? <Tag color="blue">{g.name}</Tag> : <Tag>未分配</Tag>; } },
        { title: '角色', dataIndex: 'role', render: r => <Tag color={r === 'ADMIN' ? 'gold' : 'cyan'}>{r}</Tag> },
        { title: '状态', dataIndex: 'status', render: s => <Tag color={s === 1 ? 'success' : 'error'}>{s === 1 ? '正常' : '禁用'}</Tag> },
        { title: '操作', key: 'action', render: (_, r) => (
                <Space>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditClick(r)}>编辑</Button>
                    <Popconfirm title={r.status===1?"禁用?":"启用?"} onConfirm={() => handleStatusChange(r)}>
                        <Button type="link" size="small" danger={r.status===1}>{r.status===1?'禁用':'启用'}</Button>
                    </Popconfirm>
                </Space>
            )}
    ];

    const groupColumns = [
        { title: '用户名', dataIndex: 'username', render: t => <Space><UserOutlined />{t}</Space> },
        { title: '昵称', dataIndex: 'nickname' },
        { title: '角色', dataIndex: 'role', render: r => <Tag color={r === 'ADMIN' ? 'gold' : 'cyan'}>{r === 'ADMIN' ? '小组长' : '成员'}</Tag> },
        { title: '状态', dataIndex: 'status', render: s => <Tag color={s === 1 ? 'success' : 'error'}>{s === 1 ? '正常' : '禁用'}</Tag> },
        { title: '操作', key: 'action', render: (_, record) => {
                const hasAdmin = occupiedGroupIds.includes(selectedGroupId);
                const isNormal = record.status === 1;
                return (
                    <Space size="small">
                        {isNormal && record.role === 'USER' && !hasAdmin && (
                            <Popconfirm title="设为组长?" onConfirm={() => handleChangeGroupRole(record, 'ADMIN')}><Button type="link" size="small" icon={<CrownOutlined />}>设为组长</Button></Popconfirm>
                        )}
                        {isNormal && record.role === 'ADMIN' && (
                            <Popconfirm title="降为成员?" onConfirm={() => handleChangeGroupRole(record, 'USER')}><Button type="link" size="small">设为成员</Button></Popconfirm>
                        )}
                        {/* 逻辑：所有用户都可以移出 */}
                        <Popconfirm title="确定移出该小组?" description="组长移出后角色将重置为普通用户" onConfirm={() => handleRemoveFromGroup(record)}>
                            <Button type="link" size="small" danger icon={<LogoutOutlined />}>移出</Button>
                        </Popconfirm>
                    </Space>
                );
            }}
    ];

    // --- 子视图 ---
    const AllUsersView = () => (
        <div>
            <Card style={{ marginBottom: 16 }} bordered={false} bodyStyle={{ padding: '20px 24px 0 24px' }}>
                <Form form={searchForm} layout="inline" onFinish={handleSearch}>
                    <Form.Item name="username" label="用户名"><Input allowClear /></Form.Item>
                    <Form.Item name="nickname" label="昵称"><Input allowClear /></Form.Item>
                    <Form.Item name="role" label="角色"><Select style={{ width: 120 }} allowClear><Option value="USER">普通用户</Option><Option value="ADMIN">管理员</Option></Select></Form.Item>
                    <Form.Item name="groupId" label="小组"><Select style={{ width: 150 }} allowClear>{groups.map(g => <Option key={g.id} value={g.id}>{g.name}</Option>)}</Select></Form.Item>
                    <Form.Item><Space><Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button><Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button></Space></Form.Item>
                </Form>
            </Card>
            <Table columns={allColumns} dataSource={allUsers} rowKey="id" loading={allLoading} pagination={{ current: allPage, pageSize: allPageSize, total: allTotal, showSizeChanger: true, onChange: (p, s) => { setAllPage(p); setAllPageSize(s); fetchAllUsers(p, s); } }} />
        </div>
    );

    const GroupView = () => {
        const currentGroup = groups.find(g => g.id === selectedGroupId);
        return (
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', minHeight: 400 }}>
                <Card title="小组列表" style={{ width: 300, flexShrink: 0 }} extra={<Button type="text" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>新建</Button>}>
                    <List dataSource={groups} renderItem={(item) => (
                        <List.Item style={{ cursor: 'pointer', background: item.id === selectedGroupId ? '#e6f7ff' : 'transparent', padding: '10px 15px' }} onClick={() => setSelectedGroupId(item.id)} actions={[<Tooltip title="添加成员"><Button type="text" icon={<UserAddOutlined />} size="small" onClick={(e) => openAddMemberModal(e, item)} /></Tooltip>]}>
                            <List.Item.Meta avatar={<TeamOutlined style={{ color: item.id === selectedGroupId ? '#1890ff' : '#999' }} />} title={<Tooltip title={item.description || "暂无描述"}>{item.name}</Tooltip>} />
                        </List.Item>
                    )} />
                </Card>
                <Card title={currentGroup ? (<div><div style={{fontSize:16}}>{currentGroup.name}</div><div style={{fontSize:12,color:'#999',fontWeight:'normal'}}>{currentGroup.description}</div></div>) : '小组成员'} style={{ flex: 1 }}>
                    {!selectedGroupId ? <Empty description="请选择小组" /> : <Table columns={groupColumns} dataSource={groupUsers} rowKey="id" loading={groupLoading} pagination={{ current: groupPage, pageSize: groupPageSize, total: groupTotal, showSizeChanger: true, onChange: (p, s) => { setGroupPage(p); setGroupPageSize(s); fetchGroupUsers(selectedGroupId, p, s); } }} />}
                </Card>
            </div>
        );
    };

    return (
        <div>
            <h2 style={{ marginBottom: 20 }}>用户与小组管理</h2>
            <Card>
                <Tabs activeKey={activeTab} onChange={setActiveTab} items={[{ key: '1', label: '全员列表', children: <AllUsersView /> }, { key: '2', label: '小组视图', children: <GroupView /> }]} />
            </Card>
            {/* 弹窗们放在最外层 */}
            <Modal title="新建小组" open={isModalOpen} onOk={() => modalForm.submit()} onCancel={() => setIsModalOpen(false)}><Form form={modalForm} onFinish={handleAddGroup} layout="vertical"><Form.Item name="groupName" label="名称" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="description" label="描述"><Input.TextArea /></Form.Item></Form></Modal>
            <Modal title="编辑用户" open={isEditModalOpen} onOk={handleUpdateUser} onCancel={() => setIsEditModalOpen(false)}><Form form={editForm} layout="vertical"><Form.Item name="username" label="用户名"><Input /></Form.Item><Form.Item name="nickname" label="昵称"><Input disabled /></Form.Item><Form.Item name="role" label="角色"><Select><Option value="USER">普通用户</Option><Option value="ADMIN">管理员</Option></Select></Form.Item><Form.Item name="groupId" label="小组"><Select allowClear>{groups.map(g => { const disabled = (currentEditRole === 'ADMIN' || currentEditRole === 'SUPER_ADMIN') && occupiedGroupIds.includes(g.id) && g.id !== editingUser?.groupId; return <Option key={g.id} value={g.id} disabled={disabled}>{g.name}{disabled?'(已占)':''}</Option> })}</Select></Form.Item></Form></Modal>
            <Modal title="添加成员" open={isAddMemberOpen} onOk={handleAddMembers} confirmLoading={addMemberLoading} onCancel={() => setIsAddMemberOpen(false)} width={600}><Table rowKey="id" dataSource={unassignedUsers} columns={[{ title: '用户名', dataIndex: 'username' }, { title: '昵称', dataIndex: 'nickname' }]} pagination={{ pageSize: 5 }} rowSelection={{ type: 'checkbox', onChange: setSelectedUserIds, selectedRowKeys: selectedUserIds }} /></Modal>
        </div>
    );
};

// ===========================================================================
// 组件 B: 我的小组视角 (MyGroupView) - 适用于普通组长和组员
// ===========================================================================
const MyGroupView = () => {
    const userInfo = authService.getUserInfo();
    const myGroupId = userInfo.groupId;
    const isGroupAdmin = userInfo.role === 'ADMIN';

    const [groupInfo, setGroupInfo] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [unassignedUsers, setUnassignedUsers] = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]);

    useEffect(() => {
        if (myGroupId) {
            fetchGroupInfo();
            fetchMembers();
        }
    }, [myGroupId]);

    const fetchGroupInfo = async () => {
        const res = await request.get(`/api/users/groups/${myGroupId}`);
        if (res.code === 200) setGroupInfo(res.data);
    };

    const fetchMembers = async () => {
        setLoading(true);
        // 这里为了简便直接拉100条，实际建议复用分页逻辑
        const res = await request.get('/api/users/list', { params: { pageNum: 1, pageSize: 100, groupId: myGroupId } });
        if (res.code === 200) setMembers(res.data.records);
        setLoading(false);
    };

    const handleOpenAdd = async () => {
        const res = await request.get('/api/users/unassigned');
        if (res.code === 200) setUnassignedUsers(res.data);
        setSelectedUserIds([]);
        setIsAddModalOpen(true);
    };

    const handleAddSubmit = async () => {
        if (selectedUserIds.length === 0) return message.warning('请选择用户');
        const res = await request.post('/api/users/assign-group', { groupId: myGroupId, userIds: selectedUserIds });
        if (res.code === 200) { message.success('添加成功'); setIsAddModalOpen(false); fetchMembers(); }
    };

    const handleRemove = async (userId) => {
        const res = await request.put(`/api/users/${userId}/remove-group`);
        if (res.code === 200) { message.success('已移出'); fetchMembers(); }
    };

    const columns = [
        { title: '用户名', dataIndex: 'username', render: t => <Space><UserOutlined />{t}</Space> },
        { title: '昵称', dataIndex: 'nickname' },
        { title: '角色', dataIndex: 'role', render: r => <Tag color={r==='ADMIN'?'gold':'cyan'}>{r==='ADMIN'?'组长':'成员'}</Tag> },
        { title: '状态', dataIndex: 'status', render: s => <Tag color={s===1?'success':'error'}>{s===1?'正常':'禁用'}</Tag> },
        // 只有组长才显示操作列
        ...(isGroupAdmin ? [{
            title: '操作',
            key: 'action',
            render: (_, record) => {
                // 不能移除自己，也不能移除其他 ADMIN
                if (record.id === userInfo.id || record.role === 'ADMIN') return null;
                return (
                    <Popconfirm title="移出小组?" onConfirm={() => handleRemove(record.id)}>
                        <Button type="link" danger size="small" icon={<LogoutOutlined />}>移出</Button>
                    </Popconfirm>
                );
            }
        }] : [])
    ];

    if (!groupInfo) return <Card loading={true}></Card>;

    return (
        <Card
            title={<div><span style={{ fontSize: 18 }}>{groupInfo.name}</span><span style={{ fontSize: 12, color: '#999', marginLeft: 10, fontWeight: 'normal' }}>{groupInfo.description}</span></div>}
            extra={isGroupAdmin && <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>添加成员</Button>}
        >
            <Table dataSource={members} columns={columns} rowKey="id" loading={loading} pagination={false} />
            <Modal title="邀请新成员" open={isAddModalOpen} onOk={handleAddSubmit} onCancel={() => setIsAddModalOpen(false)}><Table rowKey="id" dataSource={unassignedUsers} columns={[{ title: '用户名', dataIndex: 'username' }, { title: '昵称', dataIndex: 'nickname' }]} size="small" pagination={{ pageSize: 5 }} rowSelection={{ type: 'checkbox', onChange: setSelectedUserIds, selectedRowKeys: selectedUserIds }} /></Modal>
        </Card>
    );
};

// ===========================================================================
// 主入口组件 (UserList)
// ===========================================================================
const UserList = () => {
    // 获取当前用户信息
    const userInfo = authService.getUserInfo();

    console.log('当前登录用户:', userInfo); // 方便调试

    // 1. 如果是超级管理员 -> 显示全功能视图
    if (userInfo.role === 'SUPER_ADMIN') {
        return <SuperAdminView />;
    }

    // 2. 如果有小组 (无论是组长还是组员) -> 显示我的小组视图
    if (userInfo.groupId) {
        return <MyGroupView />;
    }

    // 3. 既不是超管，也没小组 -> 显示空状态
    return (
        <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="您暂未分配到任何小组，无权查看此页面"
            style={{ marginTop: 100 }}
        />
    );
};

export default UserList;