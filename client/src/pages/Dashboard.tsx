import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useNavigate, Link } from 'react-router-dom';
import './Dashboard.css';
import {
  Mic,
  UploadCloud,
  Clock,
  FileText,
  CheckSquare,
  Sparkles,
  Users,
  ChevronRight,
  Bot
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, workspace } = useAuth();
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState<any[]>([]);
  const [tasksCount, setTasksCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workspace?.id) {
      fetchDashboardData();
    }
  }, [workspace?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [meetingsRes, tasksRes] = await Promise.all([
        api.get(`/meetings?workspaceId=${workspace?.id}`),
        api.get(`/action-items?workspaceId=${workspace?.id}&filter=pending`)
      ]);

      setMeetings(meetingsRes.data);
      setTasksCount(tasksRes.data.length);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalDurationMinutes = meetings.reduce((acc, m) => acc + (m.durationSeconds || 0), 0);
  const totalHours = (totalDurationMinutes / 3600).toFixed(1);

  return (
    <div className="page-container">
      {/* Welcome Banner */}
      <div className="dashboard-banner">
        <div>
          <div className="dashboard-banner-tag">
            <Sparkles size={16} /> WORKSPACE INTELLIGENCE
          </div>
          <h1 className="dashboard-banner-title">
            Good morning, {user?.name.split(' ')[0]} 👋
          </h1>
          <p className="dashboard-banner-subtitle">
            Here is your team's meeting summary and task overview for today.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="dashboard-quick-actions">
          <button
            onClick={() => navigate('/invite-bot')}
            className="btn btn-accent btn-pill"
          >
            <Bot size={18} /> Invite Bot to Link
          </button>
          <button
            onClick={() => navigate('/record')}
            className="btn btn-primary btn-pill"
          >
            <Mic size={18} /> Start Recording
          </button>
          <button
            onClick={() => navigate('/upload')}
            className="btn btn-outline btn-pill"
          >
            <UploadCloud size={18} /> Upload Recording
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="kpi-grid">
        <div className="card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Meetings Processed</span>
            <FileText size={20} color="var(--color-primary)" />
          </div>
          <div className="kpi-card-value">{meetings.length}</div>
          <div className="kpi-card-footer kpi-card-footer-success">+100% processing uptime</div>
        </div>

        <div className="card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Hours Recorded</span>
            <Clock size={20} color="#f2ae30" />
          </div>
          <div className="kpi-card-value">{totalHours} hrs</div>
          <div className="kpi-card-footer">Across all team sessions</div>
        </div>

        <div className="card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Pending Tasks</span>
            <CheckSquare size={20} color="#3B82F6" />
          </div>
          <div className="kpi-card-value">{tasksCount}</div>
          <div className="kpi-card-footer">Assigned action items</div>
        </div>
      </div>

      {/* Recent Meetings Section */}
      <div>
        <div className="header-container" style={{ border: 'none', background: 'transparent', padding: 0, height: 'auto', marginBottom: '1rem' }}>
          <h2>Recent Meetings</h2>
          <Link to="/meetings" className="meeting-card-action-link" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            View All <ChevronRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="card skeleton" style={{ height: '180px' }} />
        ) : meetings.length === 0 ? (
          <div className="card recorder-card">
            <Bot size={40} color="var(--color-primary)" />
            <h3 className="recorder-title">No meetings recorded yet</h3>
            <p className="recorder-subtitle">
              Paste a Google Meet, Zoom, or Teams link to invite PulseNote AI, or start a live recording.
            </p>
            <div className="dashboard-quick-actions" style={{ justifyContent: 'center' }}>
              <button onClick={() => navigate('/invite-bot')} className="btn btn-accent">
                <Bot size={18} /> Invite Bot to Link
              </button>
              <button onClick={() => navigate('/record')} className="btn btn-primary">
                <Mic size={18} /> Record Now
              </button>
            </div>
          </div>
        ) : (
          <div className="meetings-grid">
            {meetings.slice(0, 4).map((m) => (
              <div
                key={m.id}
                onClick={() => navigate(`/meetings/${m.id}`)}
                className="card card-hover meeting-card-inner"
              >
                <div>
                  <div className="meeting-card-top">
                    <span className={`badge ${m.status === 'COMPLETED' ? 'badge-completed' : 'badge-processing'}`}>
                      {m.status}
                    </span>
                    <span className="meeting-card-date">
                      {new Date(m.date).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="meeting-card-title">{m.title}</h3>
                  <p className="meeting-card-desc">
                    {m.summary?.overview || 'Audio meeting notes ready.'}
                  </p>
                </div>

                <div className="meeting-card-footer">
                  <div className="speaker-label-row">
                    <Users size={14} />
                    <span>{m.participants?.length || 1} participants</span>
                  </div>
                  <span className="meeting-card-action-link">View Meeting →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
