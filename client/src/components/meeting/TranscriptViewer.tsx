import React, { useState } from 'react';
import { Search, Copy, Download, Edit2, Check, User, Play } from 'lucide-react';
import { api } from '../../api/client';
import './TranscriptViewer.css';

export interface Segment {
  id: string;
  speakerLabel: string;
  speakerName: string;
  startTime: number;
  endTime: number;
  text: string;
}

interface TranscriptViewerProps {
  meetingId: string;
  segments: Segment[];
  currentTime?: number;
  onSeek: (seconds: number) => void;
  onSpeakerRenamed: () => void;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  meetingId,
  segments,
  currentTime = 0,
  onSeek,
  onSpeakerRenamed
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSpeakerUpdate = async (label: string) => {
    if (!newSpeakerName.trim()) return;

    try {
      await api.patch(`/meetings/${meetingId}/speakers`, {
        speakerLabel: label,
        newSpeakerName: newSpeakerName.trim()
      });
      setEditingLabel(null);
      setNewSpeakerName('');
      onSpeakerRenamed();
    } catch (err) {
      console.error('Failed to update speaker name:', err);
    }
  };

  const handleCopyTranscript = () => {
    const text = segments.map((s) => `${s.speakerName} (${formatTime(s.startTime)}): ${s.text}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTranscript = () => {
    const text = segments.map((s) => `${s.speakerName} (${formatTime(s.startTime)}): ${s.text}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcript_${meetingId}.txt`;
    link.click();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const filteredSegments = segments.filter((s) =>
    s.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.speakerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const highlightMatch = (text: string) => {
    if (!searchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <mark key={i} className="search-highlight-text">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="card transcript-card">
      <div className="transcript-toolbar">
        <h3>Transcript</h3>

        <div className="speaker-label-row">
          <div className="transcript-search-box">
            <Search size={16} className="input-left-icon" />
            <input
              type="text"
              placeholder="Search transcript..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="header-search-input"
            />
          </div>

          <button onClick={handleCopyTranscript} className="btn btn-outline" title="Copy Transcript">
            <Copy size={15} /> {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={handleDownloadTranscript} className="btn btn-outline" title="Download TXT">
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      <div className="transcript-stream">
        {filteredSegments.length === 0 ? (
          <div className="recorder-subtitle">No transcript text matching "{searchQuery}"</div>
        ) : (
          filteredSegments.map((seg) => {
            const isCurrent = currentTime >= seg.startTime && currentTime <= seg.endTime;
            return (
              <div
                key={seg.id}
                className={`segment-item ${isCurrent ? 'segment-item-active' : ''}`}
              >
                <div className="segment-header">
                  <div className="speaker-label-row">
                    <User size={16} color="var(--color-primary)" />
                    {editingLabel === seg.speakerLabel ? (
                      <div className="speaker-label-row">
                        <input
                          type="text"
                          defaultValue={seg.speakerName}
                          onChange={(e) => setNewSpeakerName(e.target.value)}
                        />
                        <button onClick={() => handleSpeakerUpdate(seg.speakerLabel)} style={{ color: '#16A34A' }}>
                          <Check size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className="speaker-name-title">
                        {seg.speakerName}
                        <button
                          onClick={() => {
                            setEditingLabel(seg.speakerLabel);
                            setNewSpeakerName(seg.speakerName);
                          }}
                          className="speaker-edit-btn"
                          title="Rename speaker"
                        >
                          <Edit2 size={12} />
                        </button>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onSeek(seg.startTime)}
                    className="btn btn-outline timestamp-jump-btn"
                  >
                    <Play size={10} /> {formatTime(seg.startTime)}
                  </button>
                </div>

                <p className="segment-text-content">{highlightMatch(seg.text)}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
