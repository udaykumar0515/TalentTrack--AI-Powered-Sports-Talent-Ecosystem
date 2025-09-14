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
        <button
          id="upload-btn"
          onClick={handleUpload}
          disabled={isAnalyzing}
        >
          Upload Video
        </button>
      ) : (
        <div>
          <p>Selected: {selectedFile.name}</p>

          {previewUrl && (
            <div style={{ marginBottom: 8 }}>
              <video src={previewUrl} controls style={{ width: '100%', maxWidth: 400, borderRadius: 8 }} />
            </div>
          )}

          <button
            id="analyze-btn"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
          </button>
          <button onClick={resetUpload} style={{ marginLeft: 8 }}>
            Choose Different Video
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
