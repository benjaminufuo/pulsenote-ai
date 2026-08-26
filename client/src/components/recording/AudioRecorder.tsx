import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Pause, Play, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AudioRecorder.css';

export const AudioRecorder: React.FC = () => {
  const { workspace } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState(`Product Planning - ${new Date().toLocaleDateString()}`);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioCtxRef.current) audioCtxRef.current.close();
  };

  const startRecording = async () => {
    try {
      setError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Browser audio recording is not supported on this browser/device.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      visualizeWaveform();

      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);

      setIsRecording(true);
      setIsPaused(false);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else {
        setError('Unable to access microphone. Please check your audio input device.');
      }
    }
  };

  const visualizeWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        ctx.fillStyle = `rgba(128, 75, 242, ${Math.max(0.2, barHeight / canvas.height)})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

        x += barWidth;
      }
    };

    draw();
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        timerRef.current = setInterval(() => setSeconds((prev) => prev + 1), 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        clearInterval(timerRef.current);
      }
    }
  };

  const stopRecordingAndSave = async () => {
    if (!mediaRecorderRef.current) return;

    setIsSubmitting(true);
    clearInterval(timerRef.current);

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());

    setTimeout(async () => {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `recording_${Date.now()}.webm`, { type: 'audio/webm' });

        const createRes = await api.post('/meetings', {
          workspaceId: workspace?.id,
          title: title || 'Untitled Meeting',
          meetingType: 'Internal'
        });

        const meetingId = createRes.data.id;

        const formData = new FormData();
        formData.append('file', audioFile);

        await api.post(`/meetings/${meetingId}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setIsSubmitting(false);
        cleanupAudio();
        navigate(`/meetings/${meetingId}`);
      } catch (err: any) {
        console.error('Failed to submit recording:', err);
        setError('Failed to upload recording. Please try again.');
        setIsSubmitting(false);
      }
    }, 500);
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="page-container-narrow">
      <div className="card recorder-card">
        <h2 className="recorder-title">Live Meeting Recorder</h2>
        <p className="recorder-subtitle">
          Record your conversation in real-time. AI will transcribe speech and generate key notes automatically.
        </p>

        {error && (
          <div className="error-banner">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Meeting Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isRecording}
            className="form-input-full"
          />
        </div>

        {/* Audio Waveform Canvas */}
        <div className="recorder-visualizer-box">
          <canvas ref={canvasRef} width={400} height={100} className="visualizer-canvas" />
          {!isRecording && (
            <div className="visualizer-placeholder">
              Audio waveform visualization will appear here
            </div>
          )}
        </div>

        {/* Live Timer */}
        <div className={`recorder-timer ${isRecording ? 'recorder-timer-active' : ''}`}>
          {formatTime(seconds)}
        </div>

        {/* Control Action Buttons */}
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="btn btn-primary btn-pill"
          >
            <Mic size={22} /> Start Recording
          </button>
        ) : (
          <div className="recorder-actions-row">
            <button onClick={pauseRecording} className="btn btn-outline btn-pill">
              {isPaused ? <Play size={20} /> : <Pause size={20} />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>

            <button
              onClick={stopRecordingAndSave}
              disabled={isSubmitting}
              className="btn btn-danger btn-pill"
            >
              <Square size={20} /> {isSubmitting ? 'Saving...' : 'Stop Recording'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
