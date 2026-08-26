import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutGrid, List, Mic, Users, ChevronRight } from 'lucide-react';
import './MeetingsPage.css';

export const MeetingsPage: React.FC = () => {
  const { workspace } = useAuth();
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (workspace?.id) {
      fetchMeetings();
    }
  }, [workspace?.id, statusFilter, typeFilter]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      let query = `/meetings?workspaceId=${workspace?.id}`;
      if (statusFilter !== 'ALL') query += `&status=${statusFilter}`;
      if (typeFilter !== 'ALL') query += `&meetingType=${typeFilter}`;

      const res = await api.get(query);
      setMeetings(res.data);
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMeetings = meetings.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.summary?.overview?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      {/* Header Bar */}
      <div className="kpi-card-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="dashboard-banner-title" style={{ fontSize: '1.75rem' }}>Meeting Library</h1>
          <p className="dashboard-banner-subtitle">
            All recorded and uploaded meetings in your workspace.
          </p>
        </div>

        <button
          onClick={() => navigate('/record')}
          className="btn btn-primary btn-pill"
        >
          <Mic size={18} /> New Recording
        </button>
      </div>

      {/* Filter and View Controls Bar */}
      <div className="card header-container meetings-page-filter-bar">
        {/* Search */}
        <div className="input-with-icon-wrapper" style={{ flex: 1, minWidth: '220px' }}>
          <Search size={18} className="input-left-icon" />
          <input
            type="text"
            placeholder="Search meeting titles & summaries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input-full"
            style={{ paddingLeft: '38px' }}
          />
        </div>

        {/* Dropdowns & View Toggle */}
        <div className="speaker-label-row">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PROCESSING_AUDIO">Processing</option>
          </select>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="ALL">All Meeting Types</option>
            <option value="Internal">Internal</option>
            <option value="Client">Client</option>
            <option value="1-on-1">1-on-1</option>
            <option value="All Hands">All Hands</option>
          </select>

          {/* Grid/List Toggle */}
          <div className="speaker-label-row" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', gap: 0, overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('grid')}
              className={`speed-btn ${viewMode === 'grid' ? 'speed-btn-active' : ''}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`speed-btn ${viewMode === 'list' ? 'speed-btn-active' : ''}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Meeting Cards List */}
      {loading ? (
        <div className="meetings-grid">
          <div className="card skeleton" style={{ height: '200px' }} />
          <div className="card skeleton" style={{ height: '200px' }} />
          <div className="card skeleton" style={{ height: '200px' }} />
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="card recorder-card">
          <Mic size={48} color="var(--color-primary)" />
          <h3 className="recorder-title">No meetings found</h3>
          <p className="recorder-subtitle">Try adjusting your search query or status filters.</p>
          <button onClick={() => navigate('/record')} className="btn btn-primary">
            Record New Meeting
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="meetings-grid">
          {filteredMeetings.map((m) => (
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
                  {m.summary?.overview || 'Meeting recorded and processed.'}
                </p>
              </div>

              <div className="meeting-card-footer">
                <div className="speaker-label-row">
                  <Users size={14} />
                  <span>{m.participants?.length || 1} participants</span>
                </div>
                <span className="meeting-card-action-link">View →</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="meetings-list-stack">
          {filteredMeetings.map((m) => (
            <div
              key={m.id}
              onClick={() => navigate(`/meetings/${m.id}`)}
              className="card card-hover action-item-row"
              style={{ cursor: 'pointer' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="speaker-label-row" style={{ marginBottom: '4px' }}>
                  <h3 className="meeting-card-title" style={{ margin: 0 }}>{m.title}</h3>
                  <span className={`badge ${m.status === 'COMPLETED' ? 'badge-completed' : 'badge-processing'}`}>
                    {m.status}
                  </span>
                </div>
                <div className="meeting-card-date" style={{ display: 'flex', gap: '1rem' }}>
                  <span>📅 {new Date(m.date).toLocaleDateString()}</span>
                  <span>👥 {m.participants?.length || 1} participants</span>
                </div>
              </div>

              <div className="meeting-card-action-link" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                Open Workspace <ChevronRight size={18} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
