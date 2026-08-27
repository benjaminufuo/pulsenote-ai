import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { AudioPlayer } from '../components/meeting/AudioPlayer';
import { TranscriptViewer } from '../components/meeting/TranscriptViewer';
import { AINotesView } from '../components/meeting/AINotesView';
import { ProcessingProgress } from '../components/meeting/ProcessingProgress';
import { ArrowLeft, Trash2, Calendar, Clock, Users, Share2, AlertTriangle, RefreshCw, Radio } from 'lucide-react';
import './MeetingDetailPage.css';

export const MeetingDetailPage: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekTime, setSeekTime] = useState<number | null>(null);

  useEffect(() => {
    if (meetingId) {
      fetchMeetingDetail();
    }
  }, [meetingId]);

  const fetchMeetingDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/meetings/${meetingId}`);
      setMeeting(res.data);
    } catch (err) {
      console.error('Failed to fetch meeting detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeeting = async () => {
    if (window.confirm('Are you sure you want to delete this meeting recording and AI notes?')) {
      try {
        await api.delete(`/meetings/${meetingId}`);
        navigate('/meetings');
      } catch (err) {
        console.error('Failed to delete meeting:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="card skeleton" style={{ height: '80px' }} />
        <div className="card skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="card recorder-card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <h3>Meeting Not Found</h3>
        <p className="recorder-subtitle">The requested meeting recording does not exist.</p>
        <button onClick={() => navigate('/meetings')} className="btn btn-primary">
          Back to Meetings
        </button>
      </div>
    );
  }

  // Handle Failed State with Clear User Diagnostic Banner
  if (meeting.status === 'FAILED') {
    return (
      <div className="page-container-narrow">
        <button onClick={() => navigate('/meetings')} className="btn btn-outline" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to Meetings
        </button>
        <div className="card recorder-card" style={{ borderColor: '#EF4444' }}>
          <AlertTriangle size={48} color="#EF4444" />
          <h3 className="recorder-title" style={{ color: '#EF4444' }}>Bot Invite / Processing Failed</h3>
          <p className="recorder-subtitle" style={{ color: 'var(--text-main)', background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', margin: '1rem 0' }}>
            {meeting.errorMessage || 'The bot was unable to enter the live meeting URL or process audio.'}
          </p>
          <div className="speaker-label-row" style={{ gap: '0.75rem', justifyContent: 'center' }}>
            <button onClick={() => navigate('/invite-bot')} className="btn btn-primary">
              <RefreshCw size={16} /> Try Inviting Again
            </button>
            <button onClick={handleDeleteMeeting} className="btn btn-outline" style={{ color: '#EF4444', borderColor: '#EF4444' }}>
              <Trash2 size={16} /> Remove Meeting
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isProcessing = meeting.status !== 'COMPLETED';

  return (
    <div className="page-container">
      {/* Top Navigation & Actions Bar */}
      <div className="kpi-card-header">
        <button onClick={() => navigate('/meetings')} className="btn btn-outline">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="speaker-label-row">
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Meeting link copied to clipboard!');
            }}
            className="btn btn-outline"
          >
            <Share2 size={16} /> Share
          </button>
          <button
            onClick={handleDeleteMeeting}
            className="btn btn-outline"
            style={{ color: '#EF4444', borderColor: '#EF4444' }}
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* Live Active Status Header when Call is Ongoing */}
      {isProcessing && (
        <div style={{ marginBottom: '1.5rem' }}>
          <ProcessingProgress
            meetingId={meeting.id}
            currentStatus={meeting.status}
            onCompleted={fetchMeetingDetail}
          />
        </div>
      )}

      {/* Header Title Card */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="kpi-card-header" style={{ marginBottom: '0.75rem' }}>
          <div>
            <div className="speaker-label-row" style={{ gap: '0.5rem', marginBottom: '8px' }}>
              <span className={`badge ${meeting.status === 'COMPLETED' ? 'badge-completed' : 'badge-processing'}`}>
                {meeting.meetingType}
              </span>
              {isProcessing && (
                <span className="badge badge-processing" style={{ background: '#EF4444', color: '#FFF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Radio size={12} className="recording-pulse" /> LIVE STREAMING
                </span>
              )}
            </div>
            <h1 className="recorder-title" style={{ textAlign: 'left' }}>{meeting.title}</h1>
          </div>
        </div>

        <div className="speaker-label-row" style={{ gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <span className="speaker-label-row">
            <Calendar size={15} /> {new Date(meeting.date).toLocaleDateString()}
          </span>
          <span className="speaker-label-row">
            <Clock size={15} /> {Math.round((meeting.durationSeconds || 0) / 60)} min duration
          </span>
          <span className="speaker-label-row">
            <Users size={15} /> {meeting.participants?.map((p: any) => p.name).join(', ') || 'Team'}
          </span>
        </div>
      </div>

      {/* Synchronized Audio Player */}
      {meeting.audioUrl && (
        <AudioPlayer
          src={meeting.audioUrl}
          onTimeUpdate={(time) => setCurrentTime(time)}
          seekTime={seekTime}
        />
      )}

      {/* Dual Pane Layout (Desktop) / Vertical Stack (Mobile) */}
      <div className="meeting-workspace-grid">
        <div>
          <AINotesView
            summary={meeting.summary}
            actionItems={meeting.actionItems || []}
            onTasksUpdated={fetchMeetingDetail}
          />
        </div>

        <div>
          <TranscriptViewer
            meetingId={meeting.id}
            segments={meeting.transcript?.segments || []}
            currentTime={currentTime}
            onSeek={(secs) => setSeekTime(secs)}
            onSpeakerRenamed={fetchMeetingDetail}
          />
        </div>
      </div>
    </div>
  );
};
