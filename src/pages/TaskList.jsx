import React, { useState, useEffect } from 'react';
import {
    Table, Card, Button, Modal, Form, Input,
    Select, Tag, Space, message, Divider, DatePicker, Popconfirm, Row, Col
} from 'antd';
import {
    PlusOutlined, FileTextOutlined, EnvironmentOutlined,
    RocketOutlined, SaveOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined
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

    // === 基础数据 ===
    const [groups, setGroups] = useState([]);

    // === 标准库选择相关 ===
    const [allStandards, setAllStandards] = useState([]); // 从后端拉取的所有标准
    const [filteredStandards, setFilteredStandards] = useState([]); // 过滤后的标准(展示用)
    const [selectedStandardIds, setSelectedStandardIds] = useState([]);
    const [stdLoading, setStdLoading] = useState(false);
    const [searchText, setSearchText] = useState(''); // 搜索关键词

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
            const res = await request.get('/api/tasks/list', {
                params: { pageNum: page, pageSize: pageSize, username: authService.getUsername() }
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
                startTime = values.timeRange[0].format('YYYY-MM-DD HH:mm:ss');
                endTime = values.timeRange[1].format('YYYY-MM-DD HH:mm:ss');
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
                    <div>{r.startTime ? dayjs(r.startTime).format('YYYY-MM-DD HH:mm') : '-'}</div>
                    <div>{r.endTime ? dayjs(r.endTime).format('YYYY-MM-DD HH:mm') : '-'}</div>
                </div>
            )
        },
        { title: '状态', dataIndex: 'status', key: 'status',
            render: s => {
                const color = s === 'DRAFT' ? 'default' : s === 'PENDING' ? 'processing' : 'success';
                const text = s === 'DRAFT' ? '草稿' : s === 'PENDING' ? '待执行' : '已完成';
                return <Tag color={color}>{text}</Tag>;
            }
        },
        { title: '操作', key: 'action', width: 220, render: (_, record) => (
                <Space>
                    {/* 只有超管可以操作 */}
                    {isSuperAdmin && (
                        <>
                            {record.status === 'DRAFT' && (
                                <Popconfirm title="确认发布?" onConfirm={() => handlePublish(record.id)}>
                                    <Button type="link" size="small" icon={<RocketOutlined />}>发布</Button>
                                </Popconfirm>
                            )}
                            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)}>编辑</Button>
                            <Popconfirm title="确认删除?" description="删除后无法恢复" onConfirm={() => handleDelete(record.id)}>
                                <Button type="link" danger size="small" icon={<DeleteOutlined />}>删除</Button>
                            </Popconfirm>
                        </>
                    )}
                    {!isSuperAdmin && <Button type="link" size="small">查看详情</Button>}
                </Space>
            )}
    ];

    const stdColumns = [
        { title: '系统类别', dataIndex: 'category', width: 150 },
        { title: '子系统', dataIndex: 'subSystem', width: 150 },
        { title: '检查内容', dataIndex: 'content', ellipsis: true },
    ];

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <h2><FileTextOutlined /> 巡检任务管理</h2>
                {isSuperAdmin && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>新建任务</Button>
                )}
            </div>

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
                                <RangePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
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
        </div>
    );
};

export default TaskList;