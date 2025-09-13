import React, { useRef, useEffect, useState } from 'react';

interface CanvasOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  keypoints: any;
  injuryFlags: any[];
  muscleActivations?: { [key: string]: number };
}

const CanvasOverlay: React.FC<CanvasOverlayProps> = ({
  videoRef,
  containerRef,
  keypoints,
  injuryFlags,
  muscleActivations
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationFrameRef = useRef<number>();

  // Joint connections for skeleton drawing
  const connections = [
    // Head and torso
    ['nose', 'left_eye'], ['nose', 'right_eye'],
    ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
    
    // Arms
    ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
    ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
    
    // Legs
    ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
    ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video || !keypoints) return;

    const updateCanvas = () => {
      const currentTime = video.currentTime;
      const frameRate = keypoints.frameRate || 30;
      const frameIndex = Math.floor(currentTime * frameRate);
      
      setCurrentFrame(frameIndex);
      drawSkeleton(frameIndex);
      
      animationFrameRef.current = requestAnimationFrame(updateCanvas);
    };

    const handlePlay = () => {
      updateCanvas();
    };

    const handlePause = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', () => drawSkeleton(Math.floor(video.currentTime * (keypoints.frameRate || 30))));

    // Initial draw
    drawSkeleton(0);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [keypoints, injuryFlags]);

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      
      if (!canvas || !container) return;
      
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      // Redraw after resize
      drawSkeleton(currentFrame);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [currentFrame]);

  const drawSkeleton = (frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !keypoints) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const frame = keypoints.frames?.[frameIndex];
    if (!frame || !frame.keypoints) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Get flagged joints for this frame
    const flaggedJoints = new Set();
    injuryFlags.forEach(flag => {
      if (flag.frameIndex === frameIndex || Math.abs(flag.frameIndex - frameIndex) < 5) {
        // Extract joint names from flag message or type
        if (flag.message.toLowerCase().includes('knee')) {
          flaggedJoints.add('left_knee');
          flaggedJoints.add('right_knee');
        }
        if (flag.message.toLowerCase().includes('left knee')) {
          flaggedJoints.add('left_knee');
        }
        if (flag.message.toLowerCase().includes('right knee')) {
          flaggedJoints.add('right_knee');
        }
      }
    });

    // Draw skeleton connections
    ctx.lineWidth = 3;
    connections.forEach(([joint1, joint2]) => {
      const point1 = frame.keypoints[joint1];
      const point2 = frame.keypoints[joint2];
      
      if (point1 && point2 && point1.score > 0.3 && point2.score > 0.3) {
        const x1 = point1.x * canvasWidth;
        const y1 = point1.y * canvasHeight;
        const x2 = point2.x * canvasWidth;
        const y2 = point2.y * canvasHeight;
        
        // Use red color if either joint is flagged, otherwise green
        if (flaggedJoints.has(joint1) || flaggedJoints.has(joint2)) {
          ctx.strokeStyle = '#EF4444'; // Red for injury flags
          ctx.lineWidth = 4;
        } else {
          ctx.strokeStyle = '#A3E635'; // Green for normal
          ctx.lineWidth = 3;
        }
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    });

    // Draw joint points
    Object.entries(frame.keypoints).forEach(([jointName, point]: [string, any]) => {
      if (point && point.score > 0.3) {
        const x = point.x * canvasWidth;
        const y = point.y * canvasHeight;
        
        ctx.fillStyle = flaggedJoints.has(jointName) ? '#EF4444' : '#A3E635';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add pulsing effect for flagged joints
        if (flaggedJoints.has(jointName)) {
          const pulseRadius = 10 + Math.sin(Date.now() * 0.01) * 3;
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, pulseRadius, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }
    });

    // Draw muscle activations if available
    if (muscleActivations) {
      drawMuscleActivations(ctx, frame.keypoints, canvasWidth, canvasHeight);
    }
  };

  const drawMuscleActivations = (ctx: CanvasRenderingContext2D, frameKeypoints: any, width: number, height: number) => {
    if (!muscleActivations) return;

    Object.entries(muscleActivations).forEach(([muscleName, activation]: [string, number]) => {
      // Map muscle names to approximate body regions
      let centerPoint = null;
      
      if (muscleName.includes('quadriceps')) {
        const leftKnee = frameKeypoints['left_knee'];
        const leftHip = frameKeypoints['left_hip'];
        if (leftKnee && leftHip && muscleName.includes('left')) {
          centerPoint = {
            x: ((leftKnee.x + leftHip.x) / 2) * width,
            y: ((leftKnee.y + leftHip.y) / 2) * height
          };
        }
      }
      
      if (centerPoint) {
        const intensity = Math.min(activation, 1.0);
        const radius = 30 * intensity;
        const alpha = 0.3 * intensity;
        
        ctx.fillStyle = `rgba(255, 165, 0, ${alpha})`; // Orange with variable opacity
        ctx.beginPath();
        ctx.arc(centerPoint.x, centerPoint.y, radius, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  };

  return (
    <canvas
      ref={canvasRef}
      className="video-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
      }}
    />
  );
};

export default CanvasOverlay;