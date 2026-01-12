import React, { useState, useEffect } from 'react';
import {
    Table, Card, Button, Modal, Form, Input,
    Select, Tag, Space, message, Divider, DatePicker, Popconfirm, Row, Col
} from 'antd';
import {
    PlusOutlined, FileTextOutlined, EnvironmentOutlined,
    RocketOutlined, SaveOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, ReloadOutlined, StopOutlined, EyeOutlined
} from '@ant-design/icons';
import request from '../utils/request';
import { authService } from '../utils/auth';
import dayjs from 'dayjs'; // 必须确保安装了 dayjs (npm install dayjs)

const { Option } = Select;
const { RangePicker } = DatePicker;

const TaskList = () => {
    const currentUser = authService.getUserInfo();
    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

    // === 列表状态 ===
    const [tasks, setTasks] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [loading, setLoading] = useState(false);

    // === 弹窗状态 (新建/编辑) ===
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('create'); // 'create' | 'edit'
    const [editingTaskId, setEditingTaskId] = useState(null); // 当前编辑的ID
    const [form] = Form.useForm();

    const [searchForm] = Form.useForm()

    // === 基础数据 ===
    const [groups, setGroups] = useState([]);

    // === 标准库选择相关 ===
    const [allStandards, setAllStandards] = useState([]); // 从后端拉取的所有标准
    const [filteredStandards, setFilteredStandards] = useState([]); // 过滤后的标准(展示用)
    const [selectedStandardIds, setSelectedStandardIds] = useState([]);
    const [stdLoading, setStdLoading] = useState(false);
    const [searchText, setSearchText] = useState(''); // 搜索关键词

    // 新增：详情弹窗状态
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [currentTaskDetail, setCurrentTaskDetail] = useState(null);
    const [detailItems, setDetailItems] = useState([]); // 详情里的检查项

    useEffect(() => {
        fetchTasks();
        if (isSuperAdmin) {
            fetchGroups();
            fetchStandards();
        }
    }, [page, pageSize]);

    // 监听搜索词变化，前端过滤标准库
    useEffect(() => {
        if (!searchText) {
            setFilteredStandards(allStandards);
        } else {
            const lower = searchText.toLowerCase();
            const filtered = allStandards.filter(item =>
                (item.category && item.category.toLowerCase().includes(lower)) ||
                (item.subSystem && item.subSystem.toLowerCase().includes(lower))
            );
            setFilteredStandards(filtered);
        }
    }, [searchText, allStandards]);

    // --- API ---
    const fetchTasks = async () => {
        setLoading(true);
        try {
            // 1. 获取搜索栏的值
            const searchValues = searchForm.getFieldsValue();

            const res = await request.get('/api/tasks/list', {
                params: {
                    pageNum: page,
                    pageSize: pageSize,
                    username: authService.getUsername(),
                    // 2. 传递筛选参数
                    title: searchValues.title,
                    address: searchValues.address,
                    status: searchValues.status,
                    queryGroupId: searchValues.queryGroupId // 注意：参数名要和后端对齐
                }
            });
            if (res.code === 200) {
                setTasks(res.data.records);
                setTotal(res.data.total);
            }
        } finally { setLoading(false); }
    };

    const fetchGroups = async () => {
        const res = await request.get('/api/users/getGroups');
        if (res.code === 200) setGroups(res.data);
    };

    const fetchStandards = async () => {
        setStdLoading(true);
        const res = await request.get('/api/standards/list', { params: { pageSize: 1000 } });
        if (res.code === 200) {
            setAllStandards(res.data.records);
            setFilteredStandards(res.data.records);
        }
        setStdLoading(false);
    };

    // === 操作：打开新建弹窗 ===
    const handleOpenCreate = () => {
        setModalType('create');
        setEditingTaskId(null);
        form.resetFields();
        setSelectedStandardIds([]);
        setSearchText('');
        setIsModalOpen(true);
    };

    // === 操作：打开编辑弹窗 ===
    const handleOpenEdit = async (record) => {
        setModalType('edit');
        setEditingTaskId(record.id);
        setIsModalOpen(true);
        setSearchText(''); // 重置搜索

        // 获取详情回填
        const res = await request.get(`/api/tasks/${record.id}`);
        if (res.code === 200) {
            const data = res.data;
            form.setFieldsValue({
                title: data.title,
                address: data.address,
                groupId: data.groupId,
                // 回填时间范围
                timeRange: (data.startTime && data.endTime) ? [dayjs(data.startTime), dayjs(data.endTime)] : []
            });
            setSelectedStandardIds(data.standardIds || []);
        }
    };

    // === 操作：提交表单 (新建/更新) ===
    const handleSubmit = async (isPublish) => {
        try {
            const values = await form.validateFields();
            if (selectedStandardIds.length === 0) {
                message.error('请至少选择一项维保标准');
                return;
            }

            // 处理时间
            let startTime = null, endTime = null;
            if (values.timeRange && values.timeRange.length === 2) {
                startTime = values.timeRange[0].format('YYYY-MM-DD');
                endTime = values.timeRange[1].format('YYYY-MM-DD');
            }

            const payload = {
                title: values.title,
                address: values.address,
                groupId: values.groupId,
                standardIds: selectedStandardIds,
                publish: isPublish,
                createBy: currentUser.username,
                startTime,
                endTime
            };

            let res;
            if (modalType === 'create') {
                res = await request.post('/api/tasks/create', payload);
            } else {
                payload.id = editingTaskId;
                res = await request.put('/api/tasks/update', payload);
            }

            if (res.code === 200) {
                message.success(isPublish ? '任务已发布' : '保存成功');
                setIsModalOpen(false);
                fetchTasks();
            }
        } catch (error) { console.error(error); }
    };

    // === 新增：搜索和重置操作 ===
    const handleSearch = () => {
        setPage(1); // 搜索时重置回第一页
        fetchTasks();
    };

    const handleReset = () => {
        searchForm.resetFields();
        setPage(1);
        fetchTasks();
    };

    // === 操作：删除 ===
    const handleDelete = async (id) => {
        const res = await request.delete(`/api/tasks/${id}`);
        if (res.code === 200) {
            message.success('删除成功');
            fetchTasks();
        }
    };

    // === 操作：单独发布 ===
    const handlePublish = async (id) => {
        const res = await request.put(`/api/tasks/${id}/publish`);
        if (res.code === 200) {
            message.success('发布成功');
            fetchTasks();
        }
    };

    const columns = [
        { title: '任务标题', dataIndex: 'title', key: 'title', render: t => <b>{t}</b> },
        { title: '维保地址', dataIndex: 'address', key: 'address', render: t => <Space><EnvironmentOutlined />{t}</Space> },
        { title: '执行小组', dataIndex: 'groupName', key: 'groupName', render: t => <Tag color="blue">{t || '未指定'}</Tag> },
        // 显示时间范围
        { title: '起止时间', key: 'time', width: 200, render: (_, r) => (
                <div style={{ fontSize: 12, color: '#666' }}>
                    {/* 只显示日期 */}
                    <div>{r.startTime}</div>
                    <div>{r.endTime}</div>
                </div>
            )
        },
        { title: '状态', dataIndex: 'status', key: 'status',
            render: s => {
                let color = 'default';
                let text = '未知';
                switch(s) {
                    case 'DRAFT': color='default'; text='草稿'; break;
                    case 'PENDING': color='orange'; text='待执行'; break;
                    case 'IN_PROGRESS': color='processing'; text='执行中'; break;
                    case 'COMPLETED': color='success'; text='已完成'; break;
                    case 'DISCARDED': color='error'; text='已废弃'; break;
                }
                return <Tag color={color}>{text}</Tag>;
            }
        },
        {
            title: '创建时间',
            dataIndex: 'createTime',
            key: 'createTime',
            width: 160,
            render: (text) => {
                // 后端返回的 createTime 可能是 ISO 字符串，用 dayjs 格式化
                return text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-';
            }
        },
        { title: '操作', key: 'action', width: 250, render: (_, record) => (
                <Space>
                    {/* 超管操作 */}
                    {isSuperAdmin && (
                        <>
                            {record.status === 'DRAFT' ? (
                                <>
                                    <Popconfirm title="确认发布?" onConfirm={() => handlePublish(record.id)}>
                                        <Button type="link" size="small" icon={<RocketOutlined />}>发布</Button>
                                    </Popconfirm>
                                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)}>编辑</Button>
                                    <Popconfirm title="确认删除?" description="物理删除" onConfirm={() => handleDelete(record.id)}>
                                        <Button type="link" danger size="small" icon={<DeleteOutlined />}>删除</Button>
                                    </Popconfirm>
                                </>
                            ) : (
                                // 非草稿状态 (已发布/执行中/已完成) -> 只能废弃，不能物理删除
                                record.status !== 'DISCARDED' && (
                                    <>
                                        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)}>编辑</Button>
                                        <Popconfirm title="确认废弃?" description="废弃后不可恢复" onConfirm={() => handleDelete(record.id)}>
                                            <Button type="link" danger size="small" icon={<StopOutlined />}>废弃</Button>
                                        </Popconfirm>
                                    </>
                                )
                            )}
                        </>
                    )}

                    {/* 通用操作：查看详情 */}
                    <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>详情</Button>
                </Space>
            )}
    ];

    const stdColumns = [
        { title: '系统类别', dataIndex: 'category', width: 150 },
        { title: '子系统', dataIndex: 'subSystem', width: 150 },
        { title: '检查内容', dataIndex: 'content', ellipsis: true },
    ];
    // === 修改：查看详情 ===
    const handleViewDetail = async (record) => {
        // 1. 设置当前任务基本信息
        setCurrentTaskDetail(record);
        const res = await request.get(`/api/tasks/${record.id}/items`); // 需后端配合
        if (res.code === 200) {
            setDetailItems(res.data);
            setIsDetailOpen(true);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <h2><FileTextOutlined /> 巡检任务管理</h2>
                {isSuperAdmin && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>新建任务</Button>
                )}
            </div>

            {/* === 新增：搜索区域 === */}
            <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '24px 24px 0 24px' }}>
                <Form form={searchForm} layout="inline" onFinish={handleSearch}>
                    <Row gutter={[16, 16]} style={{ width: '100%' }}>
                        <Col span={6}>
                            <Form.Item name="title" label="任务标题" style={{ width: '100%' }}>
                                <Input placeholder="支持模糊搜索" allowClear />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="address" label="维保地址" style={{ width: '100%' }}>
                                <Input placeholder="支持模糊搜索" allowClear />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="status" label="任务状态" style={{ width: '100%' }}>
                                <Select placeholder="全部" allowClear>
                                    {/* 超管能看到草稿，普通用户只能看到待执行/已完成，这里做通用配置，后端会自动过滤 */}
                                    {isSuperAdmin && <Option value="DRAFT">草稿</Option>}
                                    <Option value="PENDING">待执行</Option>
                                    <Option value="PENDING">执行中</Option>
                                    <Option value="COMPLETED">已完成</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        {/* 只有超管可以筛选执行小组 */}
                        {isSuperAdmin && (
                            <Col span={6}>
                                <Form.Item name="queryGroupId" label="执行小组" style={{ width: '100%' }}>
                                    <Select placeholder="全部" allowClear>
                                        {groups.map(g => <Option key={g.id} value={g.id}>{g.name}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                        )}

                        <Col span={24} style={{ textAlign: 'right' }}>
                            <Space>
                                <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
                                <Button type="primary" icon={<SearchOutlined />} htmlType="submit">查询</Button>
                            </Space>
                        </Col>
                    </Row>
                </Form>
            </Card>

            <Card>
                <Table
                    columns={columns}
                    dataSource={tasks}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        current: page,
                        pageSize: pageSize,
                        total: total,
                        showSizeChanger: true,
                        onChange: (p, s) => { setPage(p); setPageSize(s); }
                    }}
                />
            </Card>

            <Modal
                title={modalType === 'create' ? "新建巡检任务" : "编辑巡检任务"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                width={900}
                footer={[
                    <Button key="draft" icon={<SaveOutlined />} onClick={() => handleSubmit(false)}>保存草稿</Button>,
                    <Button key="publish" type="primary" icon={<RocketOutlined />} onClick={() => handleSubmit(true)}>
                        {modalType === 'create' ? '立即发布' : '保存并发布'}
                    </Button>
                ]}
            >
                <Form form={form} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="title" label="任务标题" rules={[{ required: true }]}>
                                <Input placeholder="例：2026年1月大运中心维保" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="address" label="维保地址" rules={[{ required: true }]}>
                                <Input prefix={<EnvironmentOutlined />} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="groupId" label="指派小组" rules={[{ required: true }]}>
                                <Select placeholder="选择执行小组">
                                    {groups.map(g => <Option key={g.id} value={g.id}>{g.name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            {/* === 优化点 2：时间范围选择器 === */}
                            <Form.Item name="timeRange" label="起止时间" rules={[{ required: true }]}>
                                <RangePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left">选择维保标准项</Divider>

                    {/* === 优化点 1：模糊搜索框 === */}
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="输入系统类别或设备名称进行筛选..."
                        style={{ marginBottom: 16, width: 300 }}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        allowClear
                    />
                    <span style={{ marginLeft: 10, color: '#999' }}>
            (已选 {selectedStandardIds.length} 项)
          </span>

                    <Table
                        rowKey="id"
                        columns={stdColumns}
                        dataSource={filteredStandards} // 使用过滤后的数据源
                        loading={stdLoading}
                        size="small"
                        scroll={{ y: 300 }}
                        pagination={false}
                        rowSelection={{
                            type: 'checkbox',
                            selectedRowKeys: selectedStandardIds,
                            onChange: setSelectedStandardIds
                        }}
                    />
                </Form>
            </Modal>
            {/* === 新增：任务详情 Modal === */}
            <Modal
                title="任务详情"
                open={isDetailOpen}
                onCancel={() => setIsDetailOpen(false)}
                footer={[<Button key="close" onClick={() => setIsDetailOpen(false)}>关闭</Button>]}
                width={800}
            >
                {currentTaskDetail && (
                    <div>
                        <div style={{ marginBottom: 20, background: '#f5f5f5', padding: 15, borderRadius: 6 }}>
                            <h3>{currentTaskDetail.title}</h3>
                            <Space split={<Divider type="vertical" />}>
                                <span>地址: {currentTaskDetail.address}</span>
                                <span>小组: {currentTaskDetail.groupName}</span>
                                <span>周期: {currentTaskDetail.startTime} ~ {currentTaskDetail.endTime}</span>
                            </Space>
                        </div>

                        <h4>维保检查内容：</h4>
                        <Table
                            dataSource={detailItems}
                            rowKey="id"
                            pagination={false}
                            size="small"
                            bordered
                            columns={[
                                { title: '系统类别', dataIndex: 'category', width: 150 },
                                { title: '子系统', dataIndex: 'subSystem', width: 150 },
                                { title: '检查标准', dataIndex: 'content' }
                            ]}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default TaskList;