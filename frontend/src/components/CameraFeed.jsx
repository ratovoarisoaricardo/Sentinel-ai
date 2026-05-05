import React, { useEffect, useRef } from 'react';
const Pose = window.Pose;
const Camera = window.Camera;
const drawConnectors = window.drawConnectors;
const drawLandmarks = window.drawLandmarks;

const CameraFeed = ({ onAnomaly, isAnomaly, isThermalView, isMotionTracking, isSurveillanceActive }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const lastEmitTime = useRef(0);
  
  // Use refs for props to avoid recreating the camera/pose on every render
  const onAnomalyRef = useRef(onAnomaly);
  const isAnomalyRef = useRef(isAnomaly);
  const isMotionTrackingRef = useRef(isMotionTracking);
  const isSurveillanceActiveRef = useRef(isSurveillanceActive);

  useEffect(() => {
    onAnomalyRef.current = onAnomaly;
    isAnomalyRef.current = isAnomaly;
    isMotionTrackingRef.current = isMotionTracking;
    isSurveillanceActiveRef.current = isSurveillanceActive;
  }, [onAnomaly, isAnomaly, isMotionTracking, isSurveillanceActive]);

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

      // Draw skeleton if motion tracking is enabled
      if (isMotionTrackingRef.current && results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, [
          [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]
        ], { color: '#bf00ff', lineWidth: 2 });
        drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#ff00ff', lineWidth: 1, radius: 2 });
      }

      // HUD Overlay
      canvasCtx.font = '14px "Share Tech Mono"';
      canvasCtx.fillStyle = '#bf00ff';
      canvasCtx.fillText('SCANNING FOR ANOMALIES...', 20, 30);
      
      if (isAnomalyRef.current) {
        canvasCtx.strokeStyle = '#ff003c';
        canvasCtx.lineWidth = 4;
        canvasCtx.strokeRect(10, 10, canvasRef.current.width - 20, canvasRef.current.height - 20);
      }

      canvasCtx.restore();

      // Anomaly Detection (Frontend)
      if (isSurveillanceActiveRef.current && results.poseLandmarks) {
        const nose = results.poseLandmarks[0];
        const leftWrist = results.poseLandmarks[15];
        const rightWrist = results.poseLandmarks[16];
        
        // If wrists are above nose level (hands up)
        if (leftWrist && rightWrist && nose) {
          if (leftWrist.y < nose.y || rightWrist.y < nose.y) {
            const now = Date.now();
            // 5 second cooldown to avoid spamming the AI
            if (now - lastEmitTime.current > 5000) {
              const frame = canvasRef.current.toDataURL('image/jpeg', 0.5);
              if (onAnomalyRef.current) onAnomalyRef.current(frame);
              lastEmitTime.current = now;
            }
          }
        }
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
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Empty dependency array is critical to avoid restarting the camera

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000' }}>
      <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />
      <canvas 
        ref={canvasRef} 
        width={1280} 
        height={720} 
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover', 
          transform: 'scaleX(-1)',
          filter: isThermalView ? 'hue-rotate(180deg) saturate(300%) contrast(150%) brightness(1.2)' : 'none',
          transition: 'filter 0.5s ease'
        }} 
      />
      <div style={{ position: 'absolute', bottom: 20, left: 20, background: 'rgba(0,0,0,0.5)', padding: '5px 10px', fontSize: '10px', color: '#8b949e', fontFamily: 'Share Tech Mono' }}>
        LATENCY: 42ms | FPS: 30 | CORE: SENTINEL-X
      </div>
    </div>
  );
};

export default CameraFeed;
