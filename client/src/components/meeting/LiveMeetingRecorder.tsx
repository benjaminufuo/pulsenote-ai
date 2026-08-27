import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Radio, Sparkles, Upload, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import './LiveMeetingRecorder.css';

interface LiveMeetingRecorderProps {
  meetingId: string;
  onRecordingComplete: () => void;
}

export const LiveMeetingRecorder: React.FC<LiveMeetingRecorderProps> = ({
  meetingId,
  onRecordingComplete
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      audioChunksRef.current = [];

      // Try capturing tab/system audio first (Google Meet audio), fall back to microphone
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleUploadAudioBlob(audioBlob);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setError('Permission denied or audio capture cancelled. Please allow microphone/tab audio access.');
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      // Stop all audio/video tracks
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
  };

  const handleUploadAudioBlob = async (blob: Blob) => {
    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', blob, `meeting_rec_${meetingId}.webm`);

      await api.post(`/meetings/${meetingId}/upload-recording`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setIsUploading(false);
      onRecordingComplete();
    } catch (err: any) {
      console.error('Failed to upload recording:', err);
      setError('Failed to upload recorded audio for AI processing.');
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="card recorder-card" style={{ marginTop: '1rem', border: '1px solid var(--border-color)' }}>
      <div className="speaker-label-row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div className="speaker-label-row" style={{ gap: '0.5rem' }}>
          <Radio size={20} color={isRecording ? '#EF4444' : 'var(--color-primary)'} className={isRecording ? 'recording-pulse' : ''} />
          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
            {isRecording ? 'PulseNote AI Live Recording Active' : 'Direct Call Audio Recorder'}
          </h4>
        </div>
        {isRecording && (
          <span className="badge badge-processing" style={{ background: '#EF4444', color: '#FFF' }}>
            {formatTime(recordingTime)}
          </span>
        )}
      </div>

      <p className="recorder-subtitle" style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
        {isRecording
          ? 'PulseNote AI is capturing Google Meet audio in real time. Speak naturally in your call.'
          : 'Start direct live audio capture to record your Google Meet call and generate OpenAI & Gemini notes instantly.'}
      </p>

      {error && (
        <div className="error-banner" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {isUploading ? (
        <div className="speaker-label-row" style={{ gap: '0.75rem', justifyContent: 'center', padding: '1rem' }}>
          <Upload size={20} className="recording-pulse" color="var(--color-primary)" />
          <span>Uploading meeting audio to OpenAI Whisper & Gemini pipeline...</span>
        </div>
      ) : (
        <div className="speaker-label-row" style={{ gap: '1rem', justifyContent: 'center' }}>
          {!isRecording ? (
            <button onClick={startRecording} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', background: '#EF4444', borderColor: '#EF4444' }}>
              <Mic size={18} /> Start Live Call Recording
            </button>
          ) : (
            <button onClick={stopRecording} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', background: '#16A34A', borderColor: '#16A34A' }}>
              <Square size={16} /> Stop & Generate AI Notes (<Sparkles size={14} />)
            </button>
          )}
        </div>
      )}
    </div>
  );
};
