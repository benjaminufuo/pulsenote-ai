import React, { useState } from 'react';
import { UploadCloud, FileAudio, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './UploadPage.css';

export const UploadPage: React.FC = () => {
  const { workspace } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    const validExtensions = ['.mp3', '.wav', '.m4a', '.mp4', '.webm'];
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(ext)) {
      setError('Invalid file format. Please upload MP3, WAV, M4A, MP4, or WebM audio/video files.');
      return;
    }

    if (selectedFile.size > 100 * 1024 * 1024) {
      setError('File size exceeds the 100MB limit.');
      return;
    }

    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(15);

      const createRes = await api.post('/meetings', {
        workspaceId: workspace?.id,
        title: title || file.name,
        meetingType: 'Internal'
      });

      const meetingId = createRes.data.id;
      setUploadProgress(45);

      const formData = new FormData();
      formData.append('file', file);

      await api.post(`/meetings/${meetingId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 55) / progressEvent.total) + 45;
            setUploadProgress(percent);
          }
        }
      });

      setIsUploading(false);
      navigate(`/meetings/${meetingId}`);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.error || 'Failed to upload meeting recording. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <div className="page-container-narrow">
      <div className="card recorder-card">
        <h2 className="recorder-title">Upload Audio/Video Recording</h2>
        <p className="recorder-subtitle">
          Support MP3, WAV, M4A, MP4, and WebM files up to 100MB.
        </p>

        {error && (
          <div className="error-banner">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUploadSubmit}>
          <div className="form-group">
            <label className="form-label">Meeting Title</label>
            <input
              type="text"
              placeholder="e.g. Q4 Marketing Strategy Sync"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input-full"
              required
            />
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            className={`dropzone-container ${isDragOver ? 'dropzone-active' : ''}`}
          >
            <input
              type="file"
              id="file-upload"
              accept=".mp3,.wav,.m4a,.mp4,.webm"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <label htmlFor="file-upload" className="dropzone-content">
              <UploadCloud size={48} className="dropzone-icon" />
              {file ? (
                <div>
                  <div className="speaker-name-title" style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileAudio size={20} /> {file.name}
                  </div>
                  <div className="pro-widget-desc" style={{ marginTop: '4px' }}>
                    {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to process
                  </div>
                </div>
              ) : (
                <>
                  <span className="speaker-name-title" style={{ marginBottom: '4px' }}>
                    Drag & Drop your recording file here
                  </span>
                  <span className="pro-widget-desc">
                    or click to browse from your device
                  </span>
                </>
              )}
            </label>
          </div>

          {isUploading && (
            <div className="progress-container">
              <div className="progress-labels">
                <span>Uploading file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!file || isUploading}
            className="btn btn-primary form-input-full"
          >
            {isUploading ? 'Uploading & Processing...' : 'Process Recording with AI'}
          </button>
        </form>
      </div>
    </div>
  );
};
