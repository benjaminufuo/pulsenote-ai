import React from 'react';
import { AudioRecorder } from '../components/recording/AudioRecorder';
import './RecordPage.css';

export const RecordPage: React.FC = () => {
  return (
    <div className="record-page-wrapper">
      <AudioRecorder />
    </div>
  );
};
