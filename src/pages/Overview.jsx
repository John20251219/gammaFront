import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Statistic, Spin, message, Progress } from 'antd';
import { UserOutlined, ProjectOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import request from '../utils/request';
import { authService } from '../utils/auth';

const STATUS_CONFIG = [
  { key: 'DRAFT', name: '草稿', color: '#8c8c8c' },
  { key: 'PENDING', name: '待执行', color: '#faad14' },
  { key: 'IN_PROGRESS', name: '执行中', color: '#1890ff' },
  { key: 'COMPLETED', name: '已完成', color: '#52c41a' },
  { key: 'DISCARDED', name: '已废弃', color: '#ff4d4f' },
];

const Overview = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [inProgressTasks, setInProgressTasks] = useState([]);

  useEffect(() => {
    const username = authService.getUsername();
    if (!username) {
      message.error('请先登录');
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      request.get('/api/dashboard/stats', { params: { username } }),
      request.get('/api/dashboard/in-progress-tasks', { params: { username } }),
    ])
      .then(([statsRes, tasksRes]) => {
        if (statsRes.code === 200) setStats(statsRes.data);
        if (tasksRes.code === 200) setInProgressTasks(tasksRes.data || []);
      })
      .catch(() => message.error('加载概览数据失败'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  const taskStats = stats?.taskStats || {};
  const chartData = STATUS_CONFIG.map(({ key, name, color }) => ({
    name,
    value: Number(taskStats[key]) || 0,
    color,
  })).filter((d) => d.value > 0);

  const totalTasks = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>主页概览</h2>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/dashboard/users')}
          >
            <Statistic
              title="当前员工总数"
              value={stats?.employeeCount ?? 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/dashboard/tasks')}
          >
            <Statistic
              title="任务总数"
              value={totalTasks}
              prefix={<ProjectOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="总体任务概览" style={{ marginTop: 24 }}>
        {chartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>暂无任务数据</div>
        ) : (
          <Row gutter={24}>
            <Col xs={24} md={14}>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart margin={{ top: 36, right: 24, bottom: 24, left: 24 }}>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} 个`, '数量']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Col>
            <Col xs={24} md={10}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 24 }}>
                {STATUS_CONFIG.map(({ key, name, color }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        backgroundColor: color,
                      }}
                    />
                    <span style={{ flex: 1 }}>{name}</span>
                    <span style={{ fontWeight: 600 }}>{taskStats[key] ?? 0}</span>
                  </div>
                ))}
              </div>
            </Col>
          </Row>
        )}
      </Card>

      <Card title="执行中的任务进度" style={{ marginTop: 24 }}>
        {inProgressTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>暂无执行中的任务</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {inProgressTasks.map((task) => (
              <div
                key={task.taskId}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #f0f0f0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onClick={() => navigate('/dashboard/tasks', { state: { openDetailTaskId: task.taskId } })}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
              >
                <div style={{ marginBottom: 8, fontWeight: 500 }}>{task.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <Progress
                    type="line"
                    percent={task.progressPercent ?? 0}
                    strokeColor="#1890ff"
                    style={{ flex: 1, minWidth: 200 }}
                  />
                  <span style={{ color: '#666', whiteSpace: 'nowrap' }}>
                    {task.completedItems}/{task.totalItems}（{task.progressPercent ?? 0}%）
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Overview;
