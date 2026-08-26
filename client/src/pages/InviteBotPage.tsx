import React, { useState } from 'react';
import { Bot, Video, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './InviteBotPage.css';

export const InviteBotPage: React.FC = () => {
  const { workspace } = useAuth();
  const navigate = useNavigate();

  const [meetingUrl, setMeetingUrl] = useState('');
  const [title, setTitle] = useState('');
  const [botName, setBotName] = useState('PulseNote AI Assistant');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectPlatform = (url: string) => {
    const lower = url.toLowerCase();
    if (lower.includes('meet.google.com')) return { name: 'Google Meet', color: '#00897B', icon: '🟢' };
    if (lower.includes('zoom.us') || lower.includes('zoom.gov')) return { name: 'Zoom', color: '#2D8CFF', icon: '🔵' };
    if (lower.includes('teams.microsoft.com') || lower.includes('teams.live.com')) return { name: 'Microsoft Teams', color: '#5B5FC7', icon: '🟣' };
    if (lower.includes('webex.com')) return { name: 'Webex', color: '#00D1B2', icon: '🌐' };
    return { name: 'Live Video Link', color: 'var(--color-primary)', icon: '🎥' };
  };

  const platformInfo = detectPlatform(meetingUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingUrl.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await api.post('/meetings/invite-bot', {
        workspaceId: workspace?.id,
        meetingUrl: meetingUrl.trim(),
        title: title.trim() || `${platformInfo.name} Sync`,
        botName: botName.trim()
      });

      setIsSubmitting(false);
      navigate(`/meetings/${res.data.meetingId}`);
    } catch (err: any) {
      console.error('Invite bot error:', err);
      setError(err.response?.data?.error || 'Failed to dispatch bot to meeting URL.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container-narrow">
      <div className="card recorder-card">
        <div className="bot-header-icon">
          <Bot size={32} />
        </div>

        <h2 className="recorder-title">Invite PulseNote AI to Meeting</h2>
        <p className="recorder-subtitle">
          Paste a Google Meet, Zoom, or Microsoft Teams meeting link. Our AI bot will join the call, record audio, and generate structured notes automatically.
        </p>

        {error && (
          <div className="error-banner">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div className="kpi-card-header" style={{ marginBottom: '6px' }}>
              <label className="form-label">Meeting URL / Link *</label>
              {meetingUrl.trim() && (
                <span className="pro-widget-title" style={{ color: platformInfo.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {platformInfo.icon} {platformInfo.name} Detected
                </span>
              )}
            </div>
            <div className="input-with-icon-wrapper">
              <Video size={18} className="input-left-icon" />
              <input
                type="url"
                placeholder="https://meet.google.com/abc-defg-hij or Zoom / Teams link"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                className="form-input-full"
                style={{ paddingLeft: '38px' }}
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label">Meeting Title (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Q4 Executive Product Strategy Sync"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input-full"
            />
          </div>

          <div>
            <label className="form-label">Bot Display Name in Lobby</label>
            <input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              className="form-input-full"
              required
            />
          </div>

          <div className="platform-chips-grid">
            <div className="platform-chip">🟢 Google Meet</div>
            <div className="platform-chip">🔵 Zoom</div>
            <div className="platform-chip">🟣 MS Teams</div>
          </div>

          <button
            type="submit"
            disabled={!meetingUrl.trim() || isSubmitting}
            className="btn btn-primary form-input-full"
          >
            <Sparkles size={20} />
            {isSubmitting ? 'Dispatching AI Bot to Meeting...' : 'Invite PulseNote AI Bot'}
          </button>
        </form>
      </div>
    </div>
  );
};
