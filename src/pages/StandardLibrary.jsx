import React, { useState, useEffect } from 'react';
import { Table, Card, Select, Tag, Space, Typography, Row, Col } from 'antd';
import { ReadOutlined } from '@ant-design/icons';
import request from '../utils/request';

const { Title } = Typography;
const { Option } = Select;

const StandardLibrary = () => {
    const [data, setData] = useState([]); // 表格数据
    const [categories, setCategories] = useState([]); // 类别下拉框数据
    const [loading, setLoading] = useState(false);

    // === 新增：分页相关状态 ===
    const [current, setCurrent] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);

    const [selectedCategory, setSelectedCategory] = useState(undefined);

    // 初始化
    useEffect(() => {
        fetchCategories();
    }, []);

    // 当页码、每页条数、或者筛选类别变化时，触发查询
    useEffect(() => {
        fetchStandards();
    }, [current, pageSize, selectedCategory]);

    // 获取类别
    const fetchCategories = async () => {
        const res = await request.get('/api/standards/categories');
        if (res.code === 200) {
            setCategories(res.data);
        }
    };

    // 获取数据 (核心修改)
    const fetchStandards = async () => {
        setLoading(true);
        try {
            const res = await request.get('/api/standards/list', {
                params: {
                    pageNum: current,   // 传当前页
                    pageSize: pageSize, // 传每页条数
                    category: selectedCategory
                }
            });
            if (res.code === 200) {
                setData(res.data.records); // 设置当前页数据
                setTotal(res.data.total);  // 设置总条数
            }
        } finally {
            setLoading(false);
        }
    };

    // 处理下拉框筛选
    const handleCategoryChange = (val) => {
        setSelectedCategory(val);
        setCurrent(1); // 筛选变了，重置回第一页
    };

    const columns = [
        {
            title: '系统类别',
            dataIndex: 'category',
            key: 'category',
            width: 150,
            render: (text) => <Tag color="blue">{text}</Tag>,
        },
        {
            title: '子系统 / 设备',
            dataIndex: 'subSystem',
            key: 'subSystem',
            width: 180,
            render: (text) => <b>{text}</b>
        },
        {
            title: '维保方式',
            dataIndex: 'method',
            key: 'method',
            width: 150,
            render: (text) => {
                let color = 'default';
                if (text.includes('月度')) color = 'cyan';
                if (text.includes('季度')) color = 'geekblue';
                if (text.includes('年度')) color = 'purple';
                return <Tag color={color}>{text}</Tag>;
            }
        },
        {
            title: '维保检查内容',
            dataIndex: 'content',
            key: 'content',
            render: (text) => (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {text}
                </div>
            )
        },
    ];

    return (
        <div>
            <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
                <Col>
                    <Title level={3} style={{ margin: 0 }}>
                        <ReadOutlined /> 维保标准库
                    </Title>
                </Col>
                <Col>
                    <Space>
                        <span>快速筛选：</span>
                        <Select
                            placeholder="选择系统类别"
                            style={{ width: 200 }}
                            allowClear
                            onChange={handleCategoryChange} // 绑定修改后的处理函数
                        >
                            {categories.map(c => <Option key={c} value={c}>{c}</Option>)}
                        </Select>
                    </Space>
                </Col>
            </Row>

            <Card>
                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="id"
                    loading={loading}
                    // === 核心修改：Pagination 配置 ===
                    pagination={{
                        current: current,
                        pageSize: pageSize,
                        total: total,
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条标准`,
                        // 监听页码改变
                        onChange: (page, size) => {
                            setCurrent(page);
                            setPageSize(size);
                            // useEffect 会自动监听到状态变化并触发 fetchStandards
                        }
                    }}
                    bordered
                />
            </Card>
        </div>
    );
};

export default StandardLibrary;