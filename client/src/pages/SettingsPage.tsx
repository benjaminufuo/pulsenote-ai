import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { User, Building2, Sliders, Moon, Sun } from 'lucide-react';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
  const { user, workspace } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [members, setMembers] = useState<any[]>([]);
  const [summaryLength, setSummaryLength] = useState('detailed');
  const [autoExtractTasks, setAutoExtractTasks] = useState(true);

  useEffect(() => {
    if (workspace?.id) {
      fetchMembers();
    }
  }, [workspace?.id]);

  const fetchMembers = async () => {
    try {
      const res = await api.get(`/workspaces/${workspace?.id}/members`);
      setMembers(res.data);
    } catch (err) {
      console.error('Failed to fetch workspace members:', err);
    }
  };

  return (
    <div className="page-container-narrow" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 className="dashboard-banner-title" style={{ fontSize: '1.75rem' }}>Account & Settings</h1>
        <p className="dashboard-banner-subtitle">
          Manage your personal profile, workspace details, theme, and AI meeting summary preferences.
        </p>
      </div>

      {/* User Profile Card */}
      <div className="card settings-section-card">
        <h3 className="speaker-label-row" style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>
          <User size={20} color="var(--color-primary)" /> Profile Information
        </h3>

        <div className="speaker-label-row" style={{ gap: '1.25rem', marginBottom: '1.5rem' }}>
          <img
            src={user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
            alt="Avatar"
            style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--color-primary)' }}
          />
          <div>
            <div className="speaker-name-title" style={{ fontSize: '1.1rem' }}>{user?.name}</div>
            <div className="meeting-card-date">{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Theme Preferences */}
      <div className="card settings-section-card">
        <h3 className="speaker-label-row" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
          <Sun size={20} color="#f2ae30" /> Visual Theme Mode
        </h3>
        <div className="kpi-card-header">
          <div>
            <div className="speaker-name-title">Appearance Mode</div>
            <div className="meeting-card-date">
              Currently active: <strong style={{ textTransform: 'capitalize' }}>{theme} mode</strong>
            </div>
          </div>
          <button onClick={toggleTheme} className="btn btn-outline" style={{ gap: '0.5rem' }}>
            {theme === 'dark' ? <Sun size={18} color="#f2ae30" /> : <Moon size={18} color="#804BF2" />}
            <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
          </button>
        </div>
      </div>

      {/* AI Summary Preferences */}
      <div className="card settings-section-card">
        <h3 className="speaker-label-row" style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>
          <Sliders size={20} color="var(--color-primary)" /> AI Summary Preferences
        </h3>

        <div className="meetings-list-stack" style={{ gap: '1.25rem' }}>
          <div>
            <label className="form-label">Summary Granularity Style</label>
            <select
              value={summaryLength}
              onChange={(e) => setSummaryLength(e.target.value)}
              className="form-input-full"
            >
              <option value="concise">Concise Executive Brief (Bullet points)</option>
              <option value="detailed">Detailed Comprehensive Overview (Default)</option>
              <option value="technical">Technical Architecture & Code Focus</option>
            </select>
          </div>

          <div className="kpi-card-header">
            <div>
              <div className="speaker-name-title">Auto-extract Action Items</div>
              <div className="meeting-card-date">
                Automatically create tasks and identify assignees from meeting transcripts
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoExtractTasks}
              onChange={(e) => setAutoExtractTasks(e.target.checked)}
              className="action-item-checkbox"
            />
          </div>
        </div>
      </div>

      {/* Workspace & Team Members */}
      <div className="card settings-section-card">
        <h3 className="speaker-label-row" style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>
          <Building2 size={20} color="var(--color-primary)" /> Workspace Members ({workspace?.name})
        </h3>

        <div className="meetings-list-stack">
          {members.length === 0 ? (
            <div className="meeting-card-date">Loading workspace members...</div>
          ) : (
            members.map((m) => (
              <div key={m.id} className="action-item-row">
                <div className="speaker-label-row">
                  <img
                    src={m.user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
                    alt={m.user.name}
                    style={{ width: '36px', height: '36px', borderRadius: '50%' }}
                  />
                  <div>
                    <div className="speaker-name-title">{m.user.name}</div>
                    <div className="meeting-card-date">{m.user.email}</div>
                  </div>
                </div>
                <span className="badge badge-completed">{m.role}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
