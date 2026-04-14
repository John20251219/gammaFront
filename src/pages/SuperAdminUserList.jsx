import React, { useState, useEffect } from 'react';
import {
    Table, Tag, Space, Button, Tabs, Card,
    List, Modal, Form, Input, message, Empty, Select, Row, Col,
    Popconfirm, Tooltip
} from 'antd';
import {
    UserOutlined,
    TeamOutlined,
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    EditOutlined,
    CheckCircleOutlined,
    StopOutlined,
    UserAddOutlined,
    LogoutOutlined,
    CrownOutlined
} from '@ant-design/icons';
import request from '../utils/request';
import { ROLE_IDS } from '../constants/roles.js';

const { Option } = Select;

const roleTagColor = (roleId) => {
    const n = Number(roleId);
    if (n === ROLE_IDS.SUPER_ADMIN || n === ROLE_IDS.TEAM_LEADER) return 'gold';
    return 'cyan';
};

const SuperAdminUserList = () => {
    // === 基础数据 ===
    const [groups, setGroups] = useState([]);

    // === Tab 1: 全员列表的状态 ===
    const [allUsers, setAllUsers] = useState([]);
    const [allTotal, setAllTotal] = useState(0);
    const [allPage, setAllPage] = useState(1);
    const [allPageSize, setAllPageSize] = useState(10);
    const [allLoading, setAllLoading] = useState(false);
    const [occupiedGroupIds, setOccupiedGroupIds] = useState([]);
    // 新增：搜索表单实例
    const [searchForm] = Form.useForm();

    // === Tab 2: 小组视图的状态 (保持不变) ===
    const [groupUsers, setGroupUsers] = useState([]);
    const [groupTotal, setGroupTotal] = useState(0);
    const [groupPage, setGroupPage] = useState(1);
    const [groupPageSize, setGroupPageSize] = useState(5);
    const [groupLoading, setGroupLoading] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState(null);

    // === 其他状态 ===
    const [activeTab, setActiveTab] = useState('1');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalForm] = Form.useForm(); // 重命名一下，避免混淆

    // === 新增状态：添加成员弹窗 ===
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [unassignedUsers, setUnassignedUsers] = useState([]); // 待选用户列表
    const [selectedUserIds, setSelectedUserIds] = useState([]); // 已选中的用户ID
    const [addMemberLoading, setAddMemberLoading] = useState(false);
    const [eligibleRoles, setEligibleRoles] = useState([]);

    // 初始化加载小组 (下拉框数据源)
    useEffect(() => {
        fetchGroups();
    }, []);

    useEffect(() => {
        if (activeTab === '1') {
            fetchAllUsers(allPage, allPageSize);
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === '2' && selectedGroupId) {
            fetchGroupUsers(selectedGroupId, groupPage, groupPageSize);
        }
    }, [activeTab, selectedGroupId]);

    // === 编辑弹窗状态 ===
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null); // 当前正在编辑的用户对象
    const [editForm] = Form.useForm();
    // 监听编辑表单中的角色变化，用于联动小组选项
    const currentEditRole = Form.useWatch('role', editForm);

    // 初始化加载
    useEffect(() => {
        fetchGroups();
        fetchOccupiedGroups();
        (async () => {
            const res = await request.get('/api/users/roles/eligible');
            if (res.code === 200) setEligibleRoles(res.data || []);
        })();
    }, []);

    // 新增：获取被管理员占领的小组
    const fetchOccupiedGroups = async () => {
        const res = await request.get('/api/users/groups/occupied');
        if (res.code === 200) {
            setOccupiedGroupIds(res.data);
        }
    };

    // === 1. 获取未分组用户 (点击加号按钮时调用) ===
    const fetchUnassignedUsers = async () => {
        const res = await request.get('/api/users/unassigned');
        if (res.code === 200) {
            setUnassignedUsers(res.data);
        }
    };
    // 打开添加成员弹窗
    const openAddMemberModal = (e, group) => {
        e.stopPropagation(); // 阻止冒泡，防止触发“选中小组”
        // 必须先选中该小组，否则后面添加不知道加到哪
        setSelectedGroupId(group.id);
        // 获取数据
        fetchUnassignedUsers();
        setSelectedUserIds([]); // 清空上次选中的
        setIsAddMemberOpen(true);
    };

    // 提交：批量加入小组
    const handleAddMembers = async () => {
        if (selectedUserIds.length === 0) {
            message.warning('请选择至少一名用户');
            return;
        }
        setAddMemberLoading(true);
        try {
            const res = await request.post('/api/users/assign-group', {
                groupId: selectedGroupId,
                userIds: selectedUserIds
            });
            if (res.code === 200) {
                message.success('成员添加成功');
                setIsAddMemberOpen(false);
                // 刷新右侧列表
                fetchGroupUsers(selectedGroupId, 1, 5); // 假设 groupPage=1, size=5
            }
        } finally {
            setAddMemberLoading(false);
        }
    };

    // === 2. 组内操作：设为管理员 / 设为普通用户 ===
    const handleChangeGroupRole = async (user, targetRoleId) => {
        const res = await request.put(`/api/users/${user.id}/change-role`, null, {
            params: { targetRoleId, groupId: selectedGroupId }
        });
        if (res.code === 200) {
            message.success('角色变更成功');
            fetchGroupUsers(selectedGroupId, 1, 5); // 刷新列表
            fetchOccupiedGroups(); // 刷新“小组是否已有管理员”的状态
        }
    };

    // === 3. 组内操作：移出小组 ===
    const handleRemoveFromGroup = async (user) => {
        const res = await request.put(`/api/users/${user.id}/remove-group`);
        if (res.code === 200) {
            message.success('已移出小组');
            fetchGroupUsers(selectedGroupId, 1, 5);
            fetchOccupiedGroups();
        }
    };

    // === 重点改造：小组视图的列定义 ===
    const groupColumns = [
        { title: '用户名', dataIndex: 'username', key: 'username', render: t => <Space><UserOutlined />{t}</Space> },
        { title: '昵称', dataIndex: 'nickname', key: 'nickname' },
        { title: '角色', dataIndex: 'roleNameCn', key: 'roleCn',
            render: (t, record) => <Tag color={roleTagColor(record.role)}>{t || '—'}</Tag>
        },
        { title: '状态', dataIndex: 'status', key: 'status',
            render: s => <Tag color={s === 1 ? 'success' : 'error'}>{s === 1 ? '正常' : '禁用'}</Tag>
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => {
                // 当前小组是否已经有管理员 (occupiedIds 包含当前 groupId)
                const hasAdmin = occupiedGroupIds.includes(selectedGroupId);
                const isNormal = record.status === 1; // 是否正常未被禁用

                return (
                    <Space size="small">
                        {/* 逻辑：如果是正常用户 && 角色是USER && 本组目前没有管理员 -> 显示“设为组长” */}
                        {isNormal && (Number(record.role) === ROLE_IDS.TEAM_MEMBER || Number(record.role) === ROLE_IDS.UNGROUPED_USER) && !hasAdmin && (
                            <Popconfirm title="设为组长?" onConfirm={() => handleChangeGroupRole(record, ROLE_IDS.TEAM_LEADER)}>
                                <Button type="link" size="small" icon={<CrownOutlined />}>设为组长</Button>
                            </Popconfirm>
                        )}

                        {isNormal && Number(record.role) === ROLE_IDS.TEAM_LEADER && (
                            <Popconfirm title="降为普通成员?" onConfirm={() => handleChangeGroupRole(record, ROLE_IDS.TEAM_MEMBER)}>
                                <Button type="link" size="small">设为组员</Button>
                            </Popconfirm>
                        )}

                        {/* 逻辑：所有用户都可以移出 */}
                        <Popconfirm title="确定移出该小组?" description="移出后角色将重置为普通用户" onConfirm={() => handleRemoveFromGroup(record)}>
                            <Button type="link" size="small" danger icon={<LogoutOutlined />}>移出</Button>
                        </Popconfirm>
                    </Space>
                );
            }
        }
    ];

    // === 点击编辑按钮 ===
    const handleEditClick = (record) => {
        setEditingUser(record);
        // 重新获取一下最新的占领情况，防止并发冲突
        fetchOccupiedGroups();

        // 填充表单
        editForm.setFieldsValue({
            id: record.id,
            username: record.username,
            nickname: record.nickname,
            role: record.role,
            groupId: record.groupId
        });

        setIsEditModalOpen(true);
    };

    // === 提交编辑 ===
    const handleUpdateUser = async () => {
        try {
            const values = await editForm.validateFields();

            const res = await request.put('/api/users/update', {
                id: editingUser.id, // 别忘了传 ID
                ...values
            });

            if (res.code === 200) {
                message.success('更新成功');
                setIsEditModalOpen(false);
                // 刷新列表
                fetchAllUsers(allPage, allPageSize);
                fetchOccupiedGroups(); // 刷新占用情况
            }
            // eslint-disable-next-line no-unused-vars
        } catch (error) {
            // 校验失败或后端报错
        }
    };

    // === 新增：修改用户状态 ===
    const handleStatusChange = async (record) => {
        // 如果当前是 1(正常)，则改为 0(禁用)，反之亦然
        const newStatus = record.status === 1 ? 0 : 1;
        const actionText = newStatus === 1 ? '启用' : '禁用';

        try {
            const res = await request.put(`/api/users/${record.id}/status/${newStatus}`);
            if (res.code === 200) {
                message.success(`用户已${actionText}`);
                // 1. 刷新列表
                fetchAllUsers(allPage, allPageSize);
                // 2. 刷新占用情况 (如果是管理员被禁用，小组会释放)
                fetchOccupiedGroups();
            }
        } catch (error) {
            // 错误处理
        }
    };


    const columns = [
        { title: '用户名', dataIndex: 'username', key: 'username', render: t => <Space><UserOutlined />{t}</Space> },
        { title: '昵称', dataIndex: 'nickname', key: 'nickname' },
        { title: '所属小组', dataIndex: 'groupId', key: 'groupId',
            render: (gid) => {
                const g = groups.find(item => item.id === gid);
                return g ? <Tag color="blue">{g.name}</Tag> : <Tag>未分配</Tag>;
            }
        },
        { title: '角色', dataIndex: 'roleNameCn', key: 'roleCn', render: (t, record) => <Tag color={roleTagColor(record.role)}>{t || '—'}</Tag> },
        // === 新增列：状态 ===
        { title: '状态', dataIndex: 'status', key: 'status',
            render: (status) => (
                <Tag color={status === 1 ? 'success' : 'error'}>
                    {status === 1 ? '正常' : '已禁用'}
                </Tag>
            )
        },
        { title: '操作', key: 'action', render: (_, record) => (
                <Space size="middle">
                {/*// === 修改点：绑定点击事件 ===*/}
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditClick(record)}>
                    编辑
                </Button>
                    {/* === 新增：禁用/启用按钮 === */}
                    <Popconfirm
                        title={record.status === 1 ? "确定要禁用该用户吗?" : "确定要启用该用户吗?"}
                        description={record.status === 1 ? "禁用后该用户将无法登录" : "启用后该用户可正常使用系统"}
                        onConfirm={() => handleStatusChange(record)}
                        okText="是"
                        cancelText="否"
                    >
                        <Button
                            type="link"
                            size="small"
                            danger={record.status === 1} // 正常时显示红色(危险操作)
                            style={{ color: record.status === 0 ? '#52c41a' : undefined }} // 禁用时显示绿色(启用)
                            icon={record.status === 1 ? <StopOutlined /> : <CheckCircleOutlined />}
                        >
                            {record.status === 1 ? '禁用' : '启用'}
                        </Button>
                    </Popconfirm>
                </Space>
            )}
    ];

    const fetchGroups = async () => {
        const res = await request.get('/api/users/getGroups');
        if (res.code === 200) {
            setGroups(res.data);
            if (res.data.length > 0 && !selectedGroupId) {
                setSelectedGroupId(res.data[0].id);
            }
        }
    };

    // === 核心修改：支持搜索参数 ===
    const fetchAllUsers = async (page, size) => {
        setAllLoading(true);
        try {
            // 获取表单所有值 (包含新增的 role)
            const values = searchForm.getFieldsValue();

            const res = await request.get('/api/users/list', {
                params: {
                    pageNum: page,
                    pageSize: size,
                    excludeRoleId: ROLE_IDS.SUPER_ADMIN,
                    username: values.username,
                    nickname: values.nickname,
                    groupId: values.groupId,
                    roleId: values.role
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

    // 点击搜索按钮
    const handleSearch = () => {
        setAllPage(1); // 重置到第一页
        fetchAllUsers(1, allPageSize);
    };

    // 点击重置按钮
    const handleReset = () => {
        searchForm.resetFields(); // 清空表单
        setAllPage(1);
        fetchAllUsers(1, allPageSize);
    };

    const handleAddGroup = async (values) => {
        const res = await request.post('/api/users/newGroups', { name: values.groupName, description: values.description });
        if (res.code === 200) {
            message.success('创建成功');
            setIsModalOpen(false);
            modalForm.resetFields();
            fetchGroups();
        }
    };


    // === 视图 1: 全员表格 (带搜索栏) ===
    const AllUsersView = () => (
        <div>
            <Card style={{ marginBottom: 16 }} bordered={false} bodyStyle={{ padding: '20px 24px 0 24px' }}>
                <Form form={searchForm} layout="inline" onFinish={handleSearch}>
                    <Form.Item name="username" label="用户名">
                        <Input placeholder="输入用户名" allowClear />
                    </Form.Item>

                    <Form.Item name="nickname" label="昵称">
                        <Input placeholder="输入昵称" allowClear />
                    </Form.Item>

                    {/* === 核心修改 2: 新增角色下拉框 === */}
                    <Form.Item name="role" label="角色" style={{ minWidth: 150 }}>
                        <Select placeholder="选择角色" allowClear>
                            {eligibleRoles.map(r => <Option key={r.id} value={r.id}>{r.roleNameCn}</Option>)}
                        </Select>
                    </Form.Item>

                    <Form.Item name="groupId" label="所属小组" style={{ minWidth: 200 }}>
                        <Select placeholder="选择小组" allowClear>
                            {groups.map(g => (
                                <Option key={g.id} value={g.id}>{g.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                                查询
                            </Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>
                                重置
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Card>

            {/* 表格区域 */}
            <Table
                columns={columns}
                dataSource={allUsers}
                rowKey="id"
                loading={allLoading}
                pagination={{
                    current: allPage,
                    pageSize: allPageSize,
                    total: allTotal,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50'],
                    showTotal: (total) => `共 ${total} 条`,
                    onChange: (page, size) => {
                        setAllPage(page);
                        setAllPageSize(size);
                        // 这里一定要传 page 和 size，fetchAllUsers 内部会自动去拿 searchForm 的值
                        fetchAllUsers(page, size);
                    }
                }}
            />
        </div>
    );

    // === 视图 2: 小组管理 (代码不变) ===
    // 先获取当前选中的小组对象
    const currentGroup = groups.find(g => g.id === selectedGroupId);
    const GroupView = () => (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', minHeight: 400 }}>
            <Card title="小组列表" style={{ width: 280, flexShrink: 0 }} extra={<Button type="text" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>新建</Button>}>
                <List
                    itemLayout="horizontal"
                    dataSource={groups}
                    renderItem={(item) => (
                        <List.Item
                            style={{
                                cursor: 'pointer',
                                background: item.id === selectedGroupId ? '#e6f7ff' : 'transparent',
                                padding: '10px 15px',
                                borderRadius: '6px',
                                transition: 'all 0.3s'
                            }}
                            // onClick={() => {
                            //     setSelectedGroupId(item.id);
                            //     setGroupPage(1);
                            // }}
                            onClick={() => setSelectedGroupId(item.id)}
                            // === 改造点 1：右侧添加操作区 ===
                            actions={[
                                <Tooltip title="添加成员">
                                    <Button
                                        type="text"
                                        icon={<UserAddOutlined />}
                                        size="small"
                                        onClick={(e) => openAddMemberModal(e, item)}
                                    />
                                </Tooltip>
                            ]}
                        >
                            <List.Item.Meta
                                avatar={<TeamOutlined style={{ color: item.id === selectedGroupId ? '#1890ff' : '#999' }} />}
                                // title={<span style={{ fontWeight: item.id === selectedGroupId ? 'bold' : 'normal' }}>{item.name}</span>}
                                // === 改造点 2：标题悬浮显示描述 ===
                                title={
                                    <Tooltip title={item.description || "暂无描述"} placement="topLeft">
                                        <span style={{ fontWeight: item.id === selectedGroupId ? 'bold' : 'normal' }}>
                                         {item.name}
                                        </span>
                                    </Tooltip>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Card>

            <Card
                title={
                    currentGroup ? (
                        <div>
                            {/* 第一行：小组名称 */}
                            <div style={{ fontSize: '16px' }}>{currentGroup.name}</div>

                            {/* 第二行：小组描述 (小字、灰色、正常字重) */}
                            <div style={{ fontSize: '12px', color: '#999', fontWeight: 'normal', marginTop: '4px' }}>
                                {currentGroup.description || '暂无描述'}
                            </div>
                        </div>
                    ) : '小组成员'
                }
                style={{ flex: 1 }}
            >
                {!selectedGroupId ? <Empty description="请选择小组" /> : (
                    <Table
                        columns={groupColumns}
                        dataSource={groupUsers}
                        rowKey="id"
                        loading={groupLoading}
                        pagination={{
                            current: groupPage,
                            pageSize: groupPageSize,
                            total: groupTotal,
                            showSizeChanger: true,
                            pageSizeOptions: ['5', '10', '20'],
                            showTotal: (total) => `共 ${total} 人`,
                            onChange: (page, size) => {
                                setGroupPage(page);
                                setGroupPageSize(size);
                                fetchGroupUsers(selectedGroupId, page, size);
                            }
                        }}
                    />
                )}
            </Card>
            {/* === 新增：添加成员弹窗 === */}

        </div>
    );



    return (
        <div>
            <h2 style={{ marginBottom: 20 }}>用户与组织管理</h2>
            <Card>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        { key: '1', label: <span><UserOutlined />全员列表</span>, children: <AllUsersView /> },
                        { key: '2', label: <span><TeamOutlined />小组视图</span>, children: <GroupView /> },
                    ]}
                />
            </Card>

            <Modal
                title="添加小组成员"
                open={isAddMemberOpen}
                onOk={handleAddMembers}
                confirmLoading={addMemberLoading}
                onCancel={() => setIsAddMemberOpen(false)}
                width={600}
            >
                <Table
                    rowKey="id"
                    dataSource={unassignedUsers}
                    columns={[
                        { title: '用户名', dataIndex: 'username' },
                        { title: '昵称', dataIndex: 'nickname' },
                        { title: '状态', dataIndex: 'status', render: s => s===1?'正常':'禁用' }
                    ]}
                    pagination={{ pageSize: 5 }}
                    // === 改造点 4：多选框 ===
                    rowSelection={{
                        type: 'checkbox',
                        onChange: (selectedKeys) => setSelectedUserIds(selectedKeys)
                    }}
                />
            </Modal>

            {/* === 新增：编辑用户弹窗 === */}
            <Modal
                title="编辑用户"
                open={isEditModalOpen}
                onOk={handleUpdateUser}
                onCancel={() => setIsEditModalOpen(false)}
            >
                <Form form={editForm} layout="vertical">
                    <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
                        <Input disabled placeholder="用户名不可修改" />
                    </Form.Item>

                    <Form.Item name="nickname" label="昵称">
                        <Input disabled placeholder="昵称不可修改" />
                    </Form.Item>

                    <Form.Item name="role" label="角色" rules={[{ required: true }]}>
                        <Select placeholder="选择角色">
                            {eligibleRoles.map(r => <Option key={r.id} value={r.id}>{r.roleNameCn}</Option>)}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="groupId"
                        label="所属小组"
                        help={
                            (Number(currentEditRole) === ROLE_IDS.TEAM_LEADER || Number(currentEditRole) === ROLE_IDS.SUPER_ADMIN)
                                ? "注：组长/超管只能分配到目前没有组长的小组"
                                : ""
                        }
                    >
                        <Select placeholder="请选择小组" allowClear>
                            {groups.map(g => {
                                const isRoleAdmin = Number(currentEditRole) === ROLE_IDS.TEAM_LEADER || Number(currentEditRole) === ROLE_IDS.SUPER_ADMIN;
                                const isOccupied = occupiedGroupIds.includes(g.id);
                                const isSelfGroup = g.id === editingUser?.groupId; // 用户原本就在这个组

                                // 如果是管理员角色，且该组已被占领，且不是自己的组 -> 禁用
                                const disabled = isRoleAdmin && isOccupied && !isSelfGroup;

                                return (
                                    <Select.Option key={g.id} value={g.id} disabled={disabled}>
                                        {g.name} {disabled ? '(已有组长)' : ''}
                                    </Select.Option>
                                );
                            })}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            {/* 新增小组弹窗 */}
            <Modal title="新建小组" open={isModalOpen} onOk={() => modalForm.submit()} onCancel={() => setIsModalOpen(false)}>
                <Form form={modalForm} onFinish={handleAddGroup} layout="vertical">
                    <Form.Item name="groupName" label="小组名称" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="职责描述">
                        <Input.TextArea />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SuperAdminUserList;