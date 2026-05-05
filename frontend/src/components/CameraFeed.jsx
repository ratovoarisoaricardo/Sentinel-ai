import React, { useEffect, useRef } from 'react';
const Pose = window.Pose;
const Camera = window.Camera;
const drawConnectors = window.drawConnectors;
const drawLandmarks = window.drawLandmarks;

const CameraFeed = ({ onFrame, isAnomaly }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const lastEmitTime = useRef(0);

  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((results) => {
      const canvasCtx = canvasRef.current.getContext('2d');
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Draw video frame
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

      // Draw skeleton
      if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, [
          [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]
        ], { color: '#bf00ff', lineWidth: 2 });
        drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#ff00ff', lineWidth: 1, radius: 2 });
      }

      // HUD Overlay
      canvasCtx.font = '14px "Share Tech Mono"';
      canvasCtx.fillStyle = '#bf00ff';
      canvasCtx.fillText('SCANNING FOR ANOMALIES...', 20, 30);
      
      if (isAnomaly) {
        canvasCtx.strokeStyle = '#ff003c';
        canvasCtx.lineWidth = 4;
        canvasCtx.strokeRect(10, 10, canvasRef.current.width - 20, canvasRef.current.height - 20);
      }

      canvasCtx.restore();

      // Emit frame to backend for AI analysis (limit to 2 FPS to avoid flooding)
      const now = Date.now();
      if (now - lastEmitTime.current > 500) {
        const frame = canvasRef.current.toDataURL('image/jpeg', 0.5);
        onFrame(frame);
        lastEmitTime.current = now;
      }
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await pose.send({ image: videoRef.current });
      },
      width: 1280,
      height: 720,
    });
    camera.start();

    return () => {
      camera.stop();
      pose.close();
    };
  }, [onFrame, isAnomaly]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000' }}>
      <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />
      <canvas ref={canvasRef} width={1280} height={720} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
      <div style={{ position: 'absolute', bottom: 20, left: 20, background: 'rgba(0,0,0,0.5)', padding: '5px 10px', fontSize: '10px', color: '#8b949e', fontFamily: 'Share Tech Mono' }}>
        LATENCY: 42ms | FPS: 30 | CORE: SENTINEL-X
      </div>
    </div>
  );
};

export default CameraFeed;
