import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Sparkles, AlertCircle, Square } from 'lucide-react';
import { api } from '../../api/client';
import './ProcessingProgress.css';

interface ProcessingProgressProps {
  meetingId: string;
  currentStatus: string;
  onCompleted: () => void;
}

const pipelineSteps = [
  { key: 'JOINING', label: 'PulseNote AI Puppeteer bot joining Google Meet lobby' },
  { key: 'PROCESSING_AUDIO', label: 'Bot in meeting & recording live discussion' },
  { key: 'TRANSCRIBING', label: 'Transcribing speech with OpenAI Whisper' },
  { key: 'IDENTIFYING_SPEAKERS', label: 'Identifying meeting speakers' },
  { key: 'GENERATING_SUMMARY', label: 'Generating AI summary with GPT-4o / Gemini' },
  { key: 'GENERATING_ACTION_ITEMS', label: 'Extracting action items & decisions' }
];

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  meetingId,
  currentStatus,
  onCompleted
}) => {
  const [status, setStatus] = useState(currentStatus);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    setStatus(currentStatus);
    if (currentStatus === 'COMPLETED') {
      onCompleted();
      return;
    }

    const token = localStorage.getItem('pulsenote_token') || '';
    const streamUrl = `/api/meetings/${meetingId}/status-stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status) {
          setStatus(data.status);
          if (data.status === 'COMPLETED') {
            eventSource.close();
            onCompleted();
          }
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error, reverting to fallback polling:', err);
      eventSource.close();
    };

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/meetings/${meetingId}`);
        if (res.data?.status) {
          setStatus(res.data.status);
          if (res.data.status === 'COMPLETED') {
            clearInterval(interval);
            eventSource.close();
            onCompleted();
          }
        }
      } catch (pollErr) {
        console.error('Polling error:', pollErr);
      }
    }, 2000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [meetingId, currentStatus]);

  const handleStopBot = async () => {
    try {
      setStopping(true);
      await api.post(`/meetings/${meetingId}/leave-bot`);
    } catch (err) {
      console.error('Failed to stop bot:', err);
    } finally {
      setStopping(false);
    }
  };

  const getStepState = (stepKey: string) => {
    const statusOrder = [
      'UPLOADING',
      'JOINING',
      'PROCESSING_AUDIO',
      'TRANSCRIBING',
      'IDENTIFYING_SPEAKERS',
      'GENERATING_SUMMARY',
      'GENERATING_ACTION_ITEMS',
      'COMPLETED'
    ];

    const currentIndex = statusOrder.indexOf(status);
    const stepIndex = statusOrder.indexOf(stepKey);

    if (status === 'FAILED') return 'failed';
    if (currentIndex > stepIndex || status === 'COMPLETED') return 'completed';
    if (currentIndex === stepIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="card recorder-card" style={{ maxWidth: '600px', margin: '1.5rem auto' }}>
      <div className="bot-header-icon">
        <Sparkles size={28} />
      </div>

      <h3 className="recorder-title">PulseNote AI Active in Meeting</h3>
      <p className="recorder-subtitle">
        Our Puppeteer Chromium bot has connected to your Google Meet call, dropped the recording notice in chat, and is recording discussion.
      </p>

      <div style={{ background: 'var(--bg-subtle)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', margin: '1rem 0', fontSize: '0.85rem', color: 'var(--text-main)', borderLeft: '3px solid var(--color-primary)' }}>
        💡 <strong>Google Meet Host Tip</strong>: If your Google Meet room requires host approval, click <strong>"Admit"</strong> when PulseNote AI requests entry into the call!
      </div>

      <div className="meetings-list-stack" style={{ maxWidth: '440px', margin: '1.5rem auto 0' }}>
        {pipelineSteps.map((step) => {
          const state = getStepState(step.key);
          return (
            <div key={step.key} className="speaker-label-row">
              {state === 'completed' && <CheckCircle2 size={22} color="#16A34A" />}
              {state === 'current' && <Loader2 size={22} color="var(--color-primary)" className="recording-pulse" style={{ animation: 'spin 1s linear infinite' }} />}
              {state === 'pending' && (
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid var(--border-color)' }} />
              )}
              {state === 'failed' && <AlertCircle size={22} color="#DC2626" />}

              <span
                style={{
                  fontSize: '0.95rem',
                  fontWeight: state === 'current' ? 600 : 400,
                  color: state === 'completed' ? 'var(--text-main)' : state === 'current' ? 'var(--color-primary)' : 'var(--text-muted)'
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {(status === 'JOINING' || status === 'PROCESSING_AUDIO') && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button
            onClick={handleStopBot}
            disabled={stopping}
            className="btn btn-primary"
            style={{ background: '#EF4444', borderColor: '#EF4444', margin: '0 auto', gap: '8px' }}
          >
            {stopping ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Square size={16} />}
            {stopping ? 'Finalizing AI Notes...' : 'Stop Notetaker & Finalize Notes'}
          </button>
        </div>
      )}
    </div>
  );
};
