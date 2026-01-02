import React from 'react';
import { Table, Tag, Progress } from 'antd';

const TaskList = () => {
    const columns = [
        { title: '任务名称', dataIndex: 'task', key: 'task' },
        { title: '负责人', dataIndex: 'owner', key: 'owner' },
        { title: '进度', dataIndex: 'progress', key: 'progress',
            render: (percent) => <Progress percent={percent} size="small" />
        },
        { title: '优先级', dataIndex: 'priority', key: 'priority',
            render: (p) => {
                let color = p === 'High' ? 'volcano' : p === 'Medium' ? 'geekblue' : 'green';
                return <Tag color={color}>{p.toUpperCase()}</Tag>;
            }
        },
    ];

    const data = [
        { key: '1', task: '修复登录页 Bug', owner: 'John', progress: 100, priority: 'High' },
        { key: '2', task: '设计新版首页', owner: 'Jim', progress: 45, priority: 'Medium' },
        { key: '3', task: '服务器维护', owner: 'Joe', progress: 10, priority: 'Low' },
    ];

    return (
        <div>
            <h2>任务管理</h2>
            <Table columns={columns} dataSource={data} />
        </div>
    );
};

export default TaskList;