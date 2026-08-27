import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import './AudioPlayer.css';

interface AudioPlayerProps {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
  seekTime?: number | null;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, onTimeUpdate, seekTime }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevSrcRef = useRef<string>(src);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Initialize and update src only when src string actually changes
  useEffect(() => {
    if (audioRef.current && prevSrcRef.current !== src) {
      prevSrcRef.current = src;
      audioRef.current.src = src;
      audioRef.current.load();
      setIsPlaying(false);
    }
  }, [src]);

  useEffect(() => {
    if (audioRef.current && seekTime !== null && seekTime !== undefined) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
      if (!isPlaying) {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  }, [seekTime]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch((err) => {
          console.error('Audio playback error:', err);
        });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (onTimeUpdate) {
        onTimeUpdate(audioRef.current.currentTime);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="audio-player-card">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="audio-seekbar-row">
        <span className="audio-time-label">{formatTime(currentTime)}</span>
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="audio-slider"
        />
        <span className="audio-time-label">{formatTime(duration)}</span>
      </div>

      <div className="audio-controls-row">
        <button onClick={togglePlay} className="btn btn-primary btn-pill">
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          <span>{isPlaying ? 'Pause' : 'Play Audio'}</span>
        </button>

        <div className="speed-selector-group">
          {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
            <button
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              className={`speed-btn ${playbackSpeed === speed ? 'speed-btn-active' : ''}`}
            >
              {speed}x
            </button>
          ))}
        </div>

        <button onClick={toggleMute} style={{ color: 'var(--text-muted)' }}>
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>
    </div>
  );
};
