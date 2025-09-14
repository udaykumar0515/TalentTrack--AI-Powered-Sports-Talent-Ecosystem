import React, { useState, useRef } from 'react';
import { analyzeVideo } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';

interface VideoUploaderProps {
  exercise: string;
  onVideoAnalyzed: (session: any) => void;
  onStartAnalysis: () => void;
  isAnalyzing: boolean;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({
  exercise,
  onVideoAnalyzed,
  onStartAnalysis,
  isAnalyzing
}) => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      try {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } catch (e) {
        setPreviewUrl(null);
      }
    }
  };

  const handleUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    onStartAnalysis();

    try {
      const athleteId = user?.id ?? 'unknown';
      const session = await analyzeVideo(selectedFile, exercise, athleteId);
      onVideoAnalyzed(session);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Video analysis failed. Please try again.');
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (previewUrl) {
      try {
        URL.revokeObjectURL(previewUrl);
      } catch (e) {}
      setPreviewUrl(null);
    }
  };

  return (
    <div className="video-uploader">
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {!selectedFile ? (
        <div className="upload-area">
          <button
            className="upload-btn"
            onClick={handleUpload}
            disabled={isAnalyzing}
          >
            <span className="upload-icon">📁</span>
            Choose Video File
          </button>
          <p className="upload-hint">Select a video file to analyze</p>
        </div>
      ) : (
        <div className="upload-preview">
          <div className="file-info">
            <span className="file-icon">🎥</span>
            <span className="file-name">{selectedFile.name}</span>
          </div>

          {previewUrl && (
            <div className="video-preview">
              <video src={previewUrl} controls className="preview-video" />
            </div>
          )}

          <div className="action-buttons">
            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              <span className="analyze-icon">🔍</span>
              {isAnalyzing ? 'Analyzing...' : 'Analyze Video'}
            </button>
            <button onClick={resetUpload} className="retry-btn">
              <span className="retry-icon">🔄</span>
              Choose Different Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
