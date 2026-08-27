import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import './ProcessingProgress.css';

interface ProcessingProgressProps {
  meetingId: string;
  currentStatus: string;
  onCompleted: () => void;
}

const pipelineSteps = [
  { key: 'JOINING', label: 'AI bot requesting entry in meeting lobby' },
  { key: 'PROCESSING_AUDIO', label: 'Bot in meeting & recording live discussion' },
  { key: 'TRANSCRIBING', label: 'Transcribing speech to text' },
  { key: 'IDENTIFYING_SPEAKERS', label: 'Identifying meeting speakers' },
  { key: 'GENERATING_SUMMARY', label: 'Generating AI summary' },
  { key: 'GENERATING_ACTION_ITEMS', label: 'Extracting action items & decisions' }
];

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  meetingId,
  currentStatus,
  onCompleted
}) => {
  const [status, setStatus] = useState(currentStatus);

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

    // Polling fallback to guarantee progress updates even if SSE is blocked
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
    <div className="card recorder-card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <div className="bot-header-icon">
        <Sparkles size={28} />
      </div>

      <h3 className="recorder-title">Processing Your Meeting</h3>
      <p className="recorder-subtitle">
        Our AI pipeline is recording your meeting, generating structured transcriptions, speaker diarization, and action items.
      </p>

      <div className="meetings-list-stack" style={{ maxWidth: '420px', margin: '0 auto' }}>
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
    </div>
  );
};
