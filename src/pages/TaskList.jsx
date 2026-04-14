import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Table, Card, Button, Modal, Form, Input,
    Select, Tag, Space, message, Divider, DatePicker, Popconfirm, Row, Col,
    Checkbox, InputNumber, Image, Progress, Upload
} from 'antd';
import {
    PlusOutlined, FileTextOutlined, EnvironmentOutlined,
    RocketOutlined, SaveOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, ReloadOutlined, StopOutlined, EyeOutlined, TeamOutlined, PictureOutlined, UserOutlined, ClockCircleOutlined,
    DownloadOutlined, UploadOutlined
} from '@ant-design/icons';
import request from '../utils/request';
import { authService } from '../utils/auth';
import { isSuperAdmin } from '../constants/roles.js';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

// 辅助函数：将内容字符串按换行符拆分为数组
const parseContentToOptions = (content) => {
    if (!content) return [];
    return content.split('\n').filter(line => line.trim() !== '');
};

const TaskList = () => {
    const location = useLocation();
    const navigate = useNavigate();
    // === 用户身份 ===
    const currentUser = authService.getUserInfo();
    const isSuperAdminUser = isSuperAdmin(currentUser);

    // === 列表状态 ===
    const [tasks, setTasks] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [loading, setLoading] = useState(false);

    // === 搜索表单 ===
    const [searchForm] = Form.useForm();

    // === 弹窗状态 (新建/编辑) ===
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('create'); // 'create' | 'edit'
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [form] = Form.useForm();

    // === 详情弹窗状态 ===
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [currentTaskDetail, setCurrentTaskDetail] = useState(null);
    const [detailItems, setDetailItems] = useState([]);
    const [detailImages, setDetailImages] = useState([]); // 小程序上传的图片（含上传人、时间）

    // === 基础数据 ===
    const [groups, setGroups] = useState([]);

    // === 标准库选择相关 ===
    const [allStandards, setAllStandards] = useState([]); // 所有标准
    const [filteredStandards, setFilteredStandards] = useState([]); // 过滤后的标准(展示用)
    const [stdLoading, setStdLoading] = useState(false);
    const [searchText, setSearchText] = useState(''); // 标准搜索关键词

    // === 核心状态：选中的标准项 Map ===
    // 结构: { standardId: { quantity: number, checkedLines: string[] } }
    const [selectedItemsMap, setSelectedItemsMap] = useState({});

    useEffect(() => {
        fetchTasks();
        if (isSuperAdminUser) {
            fetchGroups();
            fetchStandards();
        }
    }, [page, pageSize]);

    // 从主页概览「执行中的任务进度」跳转过来时，自动打开对应任务详情
    useEffect(() => {
        const taskId = location.state?.openDetailTaskId;
        if (!taskId) return;
        (async () => {
            try {
                const [detailRes, itemsRes, imagesRes] = await Promise.all([
                    request.get(`/api/tasks/${taskId}`),
                    request.get(`/api/tasks/${taskId}/items`),
                    request.get(`/api/tasks/${taskId}/images-for-admin`),
                ]);
                if (detailRes.code === 200 && detailRes.data) {
                    setCurrentTaskDetail(detailRes.data);
                    if (itemsRes.code === 200) setDetailItems(itemsRes.data || []);
                    if (imagesRes.code === 200) setDetailImages(imagesRes.data || []);
                    setIsDetailOpen(true);
                }
            } catch (e) { message.error('加载任务详情失败'); }
            navigate('/dashboard/tasks', { replace: true, state: {} });
        })();
    }, [location.state?.openDetailTaskId, navigate]);

    // 监听标准库搜索词变化
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

    // --- API 请求 ---
    const fetchTasks = async () => {
        setLoading(true);
        try {
            const searchValues = searchForm.getFieldsValue();
            const res = await request.get('/api/tasks/list', {
                params: {
                    pageNum: page,
                    pageSize: pageSize,
                    username: authService.getUsername(),
                    title: searchValues.title,
                    address: searchValues.address,
                    status: searchValues.status,
                    queryGroupId: searchValues.queryGroupId
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

    // === 逻辑：表格勾选变化 ===
    const handleRowSelectionChange = (selectedRowKeys, selectedRows) => {
        const newMap = { ...selectedItemsMap };

        // 1. 如果当前 Map 中的 ID 不在 selectedRowKeys 里，说明被取消勾选了 -> 删除
        Object.keys(newMap).forEach(key => {
            if (!selectedRowKeys.includes(Number(key))) {
                delete newMap[key];
            }
        });

        // 2. 如果 selectedRows 里的 ID 不在 Map 里，说明是新勾选的 -> 初始化
        selectedRows.forEach(row => {
            if (!newMap[row.id]) {
                newMap[row.id] = {
                    quantity: 1, // 默认数量 1
                    checkedLines: parseContentToOptions(row.content) // 默认全选内容
                };
            }
        });

        setSelectedItemsMap(newMap);
    };

    // === 逻辑：修改数量 ===
    const handleQuantityChange = (id, val) => {
        setSelectedItemsMap(prev => ({
            ...prev,
            [id]: { ...prev[id], quantity: val }
        }));
    };

    // === 逻辑：修改检查内容勾选 ===
    const handleContentCheckChange = (id, checkedValues) => {
        setSelectedItemsMap(prev => ({
            ...prev,
            [id]: { ...prev[id], checkedLines: checkedValues }
        }));
    };

    // === 操作：搜索与重置 ===
    const handleSearch = () => { setPage(1); fetchTasks(); };
    const handleReset = () => { searchForm.resetFields(); setPage(1); fetchTasks(); };

    const handleExportTaskTemplate = async () => {
        const token = localStorage.getItem('auth_token');
        const username = authService.getUsername();
        const base = String(request.defaults?.baseURL ?? '').replace(/\/$/, '');
        if (!base) {
            message.error('未配置后端地址');
            return;
        }
        const url = `${base}/api/tasks/template/export?username=${encodeURIComponent(username)}`;
        try {
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (res.status === 403 || res.status === 401) {
                message.error(res.status === 401 ? '请先登录' : '仅超级管理员可导出任务模板');
                return;
            }
            if (!res.ok) {
                message.error('导出失败');
                return;
            }
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = '巡检任务导入模板.xlsx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            message.success('模板已下载');
        } catch (e) {
            console.error(e);
            message.error('导出失败');
        }
    };

    const handleImportTaskTemplate = async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('username', authService.getUsername());
        try {
            const res = await request.post('/api/tasks/template/import', fd);
            if (res.code === 200 && res.data) {
                const { successCount, failCount, errors } = res.data;
                if (failCount > 0 && errors?.length) {
                    Modal.warning({
                        title: `导入完成：成功 ${successCount} 条，失败 ${failCount} 条`,
                        width: 560,
                        content: (
                            <div style={{ maxHeight: 320, overflow: 'auto' }}>
                                {errors.map((t, i) => <div key={i} style={{ marginBottom: 6 }}>{t}</div>)}
                            </div>
                        )
                    });
                } else {
                    message.success(`导入成功，共创建 ${successCount} 条任务`);
                }
                fetchTasks();
            }
        } catch (e) {
            console.error(e);
        }
        return false;
    };

    // === 操作：打开新建弹窗 ===
    const handleOpenCreate = () => {
        setModalType('create');
        setEditingTaskId(null);
        form.resetFields();
        setSelectedItemsMap({});
        setSearchText('');
        setIsModalOpen(true);
    };

    // === 操作：打开编辑弹窗 (回显) ===
    const handleOpenEdit = async (record) => {
        setModalType('edit');
        setEditingTaskId(record.id);
        setIsModalOpen(true);
        setSearchText('');

        // 1. 回显基本信息
        const res = await request.get(`/api/tasks/${record.id}`);
        if (res.code === 200) {
            const data = res.data;
            form.setFieldsValue({
                title: data.title,
                address: data.address,
                groupId: data.groupId,
                timeRange: (data.startTime && data.endTime) ? [dayjs(data.startTime), dayjs(data.endTime)] : []
            });

            // 2. 回显检查项 (需要构建 Map)
            // 注意：这里假设后端提供了一个获取 items 的接口，或者 getDetail 里包含了 items
            // 我们调用之前定义的 /items 接口
            const itemsRes = await request.get(`/api/tasks/${record.id}/items`);
            if (itemsRes.code === 200) {
                const newMap = {};
                itemsRes.data.forEach(item => {
                    newMap[item.standardId] = {
                        quantity: item.quantity || 1,
                        // 数据库存的是快照字符串，直接拆分回数组
                        checkedLines: parseContentToOptions(item.content)
                    };
                });
                setSelectedItemsMap(newMap);
            }
        }
    };

    // === 操作：提交表单 ===
    const handleSubmit = async (isPublish) => {
        try {
            const values = await form.validateFields();

            const selectedIds = Object.keys(selectedItemsMap);
            if (selectedIds.length === 0) {
                message.error('请至少选择一项维保标准');
                return;
            }

            // 校验：内容不能为空
            for (const id of selectedIds) {
                const item = selectedItemsMap[id];
                if (!item.checkedLines || item.checkedLines.length === 0) {
                    message.error('每个选中的设备至少需要勾选一项检查内容');
                    return;
                }
            }

            // 组装 items 数据
            const itemsPayload = selectedIds.map(id => ({
                standardId: Number(id),
                quantity: selectedItemsMap[id].quantity,
                selectedContent: selectedItemsMap[id].checkedLines.join('\n') // 拼回字符串
            }));

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
                items: itemsPayload, // 注意：后端 DTO 字段名改为 items
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

    // === 操作：删除/废弃/发布 ===
    const handleDelete = async (id) => {
        const res = await request.delete(`/api/tasks/${id}`);
        if (res.code === 200) { message.success('操作成功'); fetchTasks(); }
    };
    const handlePublish = async (id) => {
        const res = await request.put(`/api/tasks/${id}/publish`);
        if (res.code === 200) { message.success('发布成功'); fetchTasks(); }
    };

    // === 操作：查看详情 ===
    const handleViewDetail = async (record) => {
        setCurrentTaskDetail(record);
        const [itemsRes, imagesRes] = await Promise.all([
            request.get(`/api/tasks/${record.id}/items`),
            request.get(`/api/tasks/${record.id}/images-for-admin`)
        ]);
        if (itemsRes.code === 200) setDetailItems(itemsRes.data);
        if (imagesRes.code === 200) setDetailImages(imagesRes.data || []);
        setIsDetailOpen(true);
    };

    // --- 列定义: 主列表 ---
    const columns = [
        { title: '任务标题', dataIndex: 'title', key: 'title', render: t => <b>{t}</b> },
        { title: '维保地址', dataIndex: 'address', key: 'address', render: t => <Space><EnvironmentOutlined />{t}</Space> },
        { title: '执行小组', dataIndex: 'groupName', key: 'groupName', render: t => <Tag color="blue">{t || '未指定'}</Tag> },
        { title: '起止时间', key: 'time', width: 180, render: (_, r) => (
                <div style={{ fontSize: 12, color: '#666' }}><div>始: {r.startTime}</div><div>止: {r.endTime}</div></div>
            )
        },
        { title: '状态', dataIndex: 'status', key: 'status',
            render: s => {
                let color = 'default'; let text = '未知';
                switch (String(s)) {
                    case '0': color='default'; text='草稿'; break;
                    case '1': color='orange'; text='待执行'; break;
                    case '2': color='processing'; text='执行中'; break;
                    case '3': color='success'; text='已完成'; break;
                    case '4': color='error'; text='已废弃'; break;
                }
                return <Tag color={color}>{text}</Tag>;
            }
        },
        { title: '创建时间', dataIndex: 'createTime', width: 150, render: t => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-' },
        { title: '操作', key: 'action', width: 220, render: (_, record) => (
                <Space>
                    {isSuperAdminUser && (
                        <>
                            {record.status === '0' || record.status === 0 ? (
                                <>
                                    <Popconfirm title="确认发布?" onConfirm={() => handlePublish(record.id)}><Button type="link" size="small" icon={<RocketOutlined />}>发布</Button></Popconfirm>
                                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)}>编辑</Button>
                                    <Popconfirm title="确认删除?" description="物理删除" onConfirm={() => handleDelete(record.id)}><Button type="link" danger size="small" icon={<DeleteOutlined />}>删除</Button></Popconfirm>
                                </>
                            ) : (
                                (record.status !== '4' && record.status !== 4) && (
                                    <>
                                        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)}>编辑</Button>
                                        <Popconfirm title="确认废弃?" description="废弃后不可恢复" onConfirm={() => handleDelete(record.id)}><Button type="link" danger size="small" icon={<StopOutlined />}>废弃</Button></Popconfirm>
                                    </>
                                )
                            )}
                        </>
                    )}
                    {(record.status !== '0' && record.status !== 0) && (
                        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>详情</Button>
                    )}
                </Space>
            )}
    ];

    // --- 列定义: 弹窗内的标准选择表格 (核心修改) ---
    const stdColumns = [
        { title: '系统', dataIndex: 'category', width: 100 },
        { title: '设备', dataIndex: 'subSystem', width: 120 },
        {
            title: '数量',
            key: 'quantity',
            width: 100,
            render: (_, record) => {
                const isSelected = !!selectedItemsMap[record.id];
                return isSelected ? (
                    <InputNumber
                        min={1}
                        size="small"
                        value={selectedItemsMap[record.id]?.quantity}
                        onChange={(val) => handleQuantityChange(record.id, val)}
                    />
                ) : '-';
            }
        },
        {
            title: '检查内容 (可多选)',
            key: 'content',
            render: (_, record) => {
                const isSelected = !!selectedItemsMap[record.id];
                const allOptions = parseContentToOptions(record.content);

                if (!isSelected) {
                    return <div style={{whiteSpace: 'pre-wrap', color: '#999', fontSize: 12}}>{record.content}</div>;
                }

                return (
                    <Checkbox.Group
                        options={allOptions}
                        value={selectedItemsMap[record.id]?.checkedLines}
                        onChange={(vals) => handleContentCheckChange(record.id, vals)}
                        style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
                    />
                );
            }
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2><FileTextOutlined /> 巡检任务管理</h2>
                {isSuperAdminUser && (
                    <Space>
                        <Button icon={<DownloadOutlined />} onClick={handleExportTaskTemplate}>导出任务模板</Button>
                        <Upload accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" showUploadList={false} beforeUpload={handleImportTaskTemplate}>
                            <Button icon={<UploadOutlined />}>导入模板</Button>
                        </Upload>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>新建任务</Button>
                    </Space>
                )}
            </div>

            {/* 搜索栏 */}
            <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '24px 24px 0 24px' }}>
                <Form form={searchForm} layout="inline" onFinish={handleSearch}>
                    <Row gutter={[16, 16]} style={{ width: '100%' }}>
                        <Col span={6}><Form.Item name="title" label="任务标题" style={{ width: '100%' }}><Input placeholder="模糊搜索" allowClear /></Form.Item></Col>
                        <Col span={6}><Form.Item name="address" label="维保地址" style={{ width: '100%' }}><Input placeholder="模糊搜索" allowClear /></Form.Item></Col>
                        <Col span={6}>
                            <Form.Item name="status" label="状态" style={{ width: '100%' }}>
                                <Select placeholder="全部" allowClear>
                                    {isSuperAdminUser && <Option value="0">草稿</Option>}
                                    <Option value="1">待执行</Option>
                                    <Option value="2">执行中</Option>
                                    <Option value="3">已完成</Option>
                                    {isSuperAdminUser && <Option value="4">已废弃</Option>}
                                </Select>
                            </Form.Item>
                        </Col>
                        {isSuperAdminUser && (
                            <Col span={6}>
                                <Form.Item name="queryGroupId" label="小组" style={{ width: '100%' }}>
                                    <Select placeholder="全部" allowClear>{groups.map(g => <Option key={g.id} value={g.id}>{g.name}</Option>)}</Select>
                                </Form.Item>
                            </Col>
                        )}
                        <Col span={24} style={{ textAlign: 'right' }}>
                            <Space><Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button><Button type="primary" icon={<SearchOutlined />} htmlType="submit">查询</Button></Space>
                        </Col>
                    </Row>
                </Form>
            </Card>

            <Card>
                <Table
                    columns={columns} dataSource={tasks} rowKey="id" loading={loading}
                    pagination={{ current: page, pageSize: pageSize, total: total, showSizeChanger: true, onChange: (p, s) => { setPage(p); setPageSize(s); } }}
                />
            </Card>

            {/* 新建/编辑任务弹窗 */}
            <Modal
                title={modalType === 'create' ? "新建巡检任务" : "编辑巡检任务"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                width={1000}
                footer={[
                    <Button key="draft" icon={<SaveOutlined />} onClick={() => handleSubmit(false)}>保存草稿</Button>,
                    <Button key="publish" type="primary" icon={<RocketOutlined />} onClick={() => handleSubmit(true)}>{modalType === 'create' ? '立即发布' : '保存并发布'}</Button>
                ]}
            >
                <Form form={form} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="title" label="任务标题" rules={[{ required: true }]}><Input placeholder="例：2026年1月大运中心维保" /></Form.Item></Col>
                        <Col span={12}><Form.Item name="address" label="维保地址" rules={[{ required: true }]}><Input prefix={<EnvironmentOutlined />} /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="groupId" label="指派小组" rules={[{ required: true }]}>
                                <Select placeholder="选择执行小组">{groups.map(g => <Option key={g.id} value={g.id}>{g.name}</Option>)}</Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="timeRange" label="起止日期" rules={[{ required: true }]}>
                                <RangePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left">选择维保标准项</Divider>

                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="输入系统类别或设备名称进行筛选..."
                        style={{ marginBottom: 16, width: 300 }}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        allowClear
                    />
                    <span style={{ marginLeft: 10, color: '#999' }}>(已选 {Object.keys(selectedItemsMap).length} 个设备)</span>

                    <Table
                        rowKey="id"
                        columns={stdColumns}
                        dataSource={filteredStandards}
                        loading={stdLoading}
                        size="small"
                        scroll={{ y: 400 }}
                        pagination={false}
                        rowSelection={{
                            type: 'checkbox',
                            selectedRowKeys: Object.keys(selectedItemsMap).map(Number),
                            onChange: handleRowSelectionChange
                        }}
                    />
                </Form>
            </Modal>

            {/* 任务详情弹窗 */}
            <Modal
                title="任务详情"
                open={isDetailOpen}
                onCancel={() => setIsDetailOpen(false)}
                footer={[<Button key="close" onClick={() => setIsDetailOpen(false)}>关闭</Button>]}
                width={900}
            >
                {currentTaskDetail && (
                    <div>
                        <div style={{ marginBottom: 20, background: '#f9f9f9', padding: 15, borderRadius: 6, border: '1px solid #eee' }}>
                            <h3 style={{marginTop:0}}>{currentTaskDetail.title}</h3>
                            <Space split={<Divider type="vertical" />} wrap>
                                <span><EnvironmentOutlined /> {currentTaskDetail.address}</span>
                                <span><TeamOutlined /> {currentTaskDetail.groupName}</span>
                                <span>周期: {currentTaskDetail.startTime} ~ {currentTaskDetail.endTime}</span>
                            </Space>
                        </div>

                        <h4>维保检查明细</h4>
                        <Table
                            dataSource={detailItems}
                            rowKey="id"
                            pagination={false}
                            size="small"
                            bordered
                            scroll={{ x: 800 }}
                            columns={[
                                { title: '设备', dataIndex: 'subSystem', width: 140, ellipsis: true },
                                { title: '数量', dataIndex: 'quantity', width: 72, align: 'center' },
                                { title: '检查标准', dataIndex: 'content', width: 260, render: t => <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{t}</div> },
                                {
                                    title: '上传记录',
                                    key: 'uploadRecords',
                                    width: 260,
                                    render: (_, record) => {
                                        const rowImages = detailImages.filter(img => img.taskItemId === record.id);
                                        if (!rowImages.length) return <span style={{ color: '#999' }}>暂无上传</span>;
                                        return (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {rowImages.map((img) => (
                                                    <div key={img.id} style={{ width: 110, border: '1px solid #eee', borderRadius: 6, overflow: 'hidden', background: '#fafafa' }}>
                                                        <Image src={img.imageUrl} alt="" style={{ width: 108, height: 108, objectFit: 'cover' }} />
                                                        <div style={{ padding: '4px 6px', fontSize: 11 }}>
                                                            <div title={img.uploadBy}><UserOutlined /> {img.uploadBy || '—'}</div>
                                                            <div style={{ color: '#999' }}><ClockCircleOutlined /> {img.createTime ? dayjs(img.createTime).format('MM-DD HH:mm') : '—'}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    }
                                },
                                {
                                    title: '子项进度',
                                    key: 'itemProgress',
                                    width: 120,
                                    align: 'center',
                                    render: (_, record) => {
                                        const required = Math.max(1, parseInt(record.quantity, 10) || 1);
                                        const uploaded = detailImages.filter(img => img.taskItemId === record.id).length;
                                        const percent = required > 0 ? Math.min(100, Math.round((uploaded / required) * 100)) : 0;
                                        return (
                                            <div>
                                                <div style={{ fontSize: 12, marginBottom: 4 }}>{uploaded}/{required}</div>
                                                <Progress percent={percent} size="small" showInfo={false} />
                                            </div>
                                        );
                                    }
                                }
                            ]}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default TaskList;