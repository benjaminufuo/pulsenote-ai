import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, ExternalLink } from 'lucide-react';
import './TasksPage.css';

export const TasksPage: React.FC = () => {
  const { workspace } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    if (workspace?.id) {
      fetchTasks();
    }
  }, [workspace?.id, filter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/action-items?workspaceId=${workspace?.id}&filter=${filter}`);
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId: string, currentCompleted: boolean) => {
    try {
      await api.patch(`/action-items/${taskId}`, { completed: !currentCompleted });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed: !currentCompleted } : t))
      );
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  return (
    <div className="page-container-medium">
      <div className="tasks-page-header">
        <div>
          <h1 className="dashboard-banner-title" style={{ fontSize: '1.75rem' }}>Action Items & Tasks</h1>
          <p className="dashboard-banner-subtitle">
            Aggregated tasks extracted by AI across all your workspace meetings.
          </p>
        </div>

        <div className="tasks-page-filters-box">
          {['all', 'pending', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`speed-btn ${filter === f ? 'speed-btn-active' : ''}`}
              style={{ textTransform: 'capitalize', flex: 1 }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card skeleton" style={{ height: '300px' }} />
      ) : tasks.length === 0 ? (
        <div className="card recorder-card">
          <CheckSquare size={48} color="#16A34A" />
          <h3 className="recorder-title">You're all caught up 🎉</h3>
          <p className="recorder-subtitle">No action items match the selected filter.</p>
        </div>
      ) : (
        <div className="meetings-list-stack">
          {tasks.map((task) => (
            <div key={task.id} className="card task-item-card">
              <div className="speaker-label-row" style={{ flex: 1, minWidth: 0, gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task.id, task.completed)}
                  className="action-item-checkbox"
                />
                <div style={{ minWidth: 0 }}>
                  <div className={`speaker-name-title ${task.completed ? 'action-item-text-completed' : ''}`}>
                    {task.task}
                  </div>

                  <div className="meeting-card-date" style={{ display: 'flex', gap: '1rem', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span>👤 {task.assigneeName || 'Unassigned'}</span>
                    {task.dueDate && <span>📅 Due {new Date(task.dueDate).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>

              {task.meeting && (
                <button
                  onClick={() => navigate(`/meetings/${task.meeting.id}`)}
                  className="btn btn-outline timestamp-jump-btn task-source-btn"
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    From: {task.meeting.title}
                  </span>
                  <ExternalLink size={12} style={{ flexShrink: 0 }} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
