import React, { useRef, useEffect, useState } from 'react';
import CanvasOverlay from './CanvasOverlay';

interface VideoPlayerWithOverlayProps {
  session: any;
  onVideoLoad?: () => void;
}

const VideoPlayerWithOverlay: React.FC<VideoPlayerWithOverlayProps> = ({
  session,
  onVideoLoad
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [keypoints, setKeypoints] = useState<any>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  useEffect(() => {
    if (session && session.keypointsUrl) {
      loadKeypoints();
    } else if (session && session.keypoints) {
      setKeypoints(session.keypoints);
    }
  }, [session]);

  const loadKeypoints = async () => {
    try {
      const response = await fetch(session.keypointsUrl);
      const keypointsData = await response.json();
      setKeypoints(keypointsData);
    } catch (error) {
      console.error('Failed to load keypoints:', error);
    }
  };

  const handleVideoLoadedData = () => {
    setIsVideoLoaded(true);
    if (onVideoLoad) {
      onVideoLoad();
    }
  };

  const getVideoSource = () => {
    if (session.videoUrl) {
      return session.videoUrl;
    }
    // If no URL, might be a local blob
    return session.videoBlob ? URL.createObjectURL(session.videoBlob) : '';
  };

  return (
    <div className="video-container" ref={containerRef}>
      <video
        ref={videoRef}
        className="video-player"
        controls
        onLoadedData={handleVideoLoadedData}
        src={getVideoSource()}
      />
      
      {isVideoLoaded && keypoints && (
        <CanvasOverlay
          videoRef={videoRef}
          containerRef={containerRef}
          keypoints={keypoints}
          injuryFlags={session.injuryFlags || []}
          muscleActivations={session.metrics?.muscleActivations}
        />
      )}
    </div>
  );
};

export default VideoPlayerWithOverlay;