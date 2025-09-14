import React, { useState, useRef } from 'react';
import { analyzeVideo } from '../api/apiClient';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
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
      // Call backend API to analyze video
      const session = await analyzeVideo(selectedFile, exercise, 'athleteA'); // TODO: Get actual athlete ID
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
          <button 
            id="analyze-btn"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
          </button>
          <button onClick={resetUpload}>Choose Different Video</button>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;