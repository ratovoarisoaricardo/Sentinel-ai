import React, { useEffect, useRef, useState } from 'react';
const Pose = window.Pose;
const Camera = window.Camera;
const drawConnectors = window.drawConnectors;
const drawLandmarks = window.drawLandmarks;

const CameraFeed = ({ onAnomaly, isAnomaly, isThermalView, isMotionTracking, isSurveillanceActive }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const lastEmitTime = useRef(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  
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

      setIsCameraReady(true);

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
            // 15 second cooldown to avoid spamming the AI (Gemini Free Tier limit is 15 RPM)
            if (now - lastEmitTime.current > 15000) {
              const frame = canvasRef.current.toDataURL('image/jpeg', 0.5);
              if (onAnomalyRef.current) onAnomalyRef.current(frame);
              lastEmitTime.current = now;
            }
          }
        }
      }
    });

    const startCamera = async (deviceId = null) => {
      try {
        console.log('Attempting to start camera with deviceId:', deviceId || 'Default');
        const constraints = {
          video: deviceId ? { 
            deviceId: deviceId,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } : {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play(); // Ensure playback starts
          
          let isProcessing = false;
          const processFrame = async () => {
            if (videoRef.current && videoRef.current.readyState >= 2 && !isProcessing) {
              isProcessing = true;
              try {
                await pose.send({ image: videoRef.current });
              } catch (e) {
                console.error("Pose processing error:", e);
              } finally {
                isProcessing = false;
              }
            }
            if (videoRef.current && videoRef.current.srcObject) {
              requestAnimationFrame(processFrame);
            }
          };
          requestAnimationFrame(processFrame);
          console.log('Camera stream started successfully.');
        }
      } catch (err) {
        console.error('Error starting camera:', err);
        if (deviceId) {
          console.warn('Preferred camera failed. Falling back to default...');
          startCamera(null); 
        }
      }
    };

    const initializeSystem = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        let targetDevice = videoDevices.find(d => {
          const label = d.label.toLowerCase();
          return (label.includes('integrated') || label.includes('built-in') || label.includes('facetime')) && !label.includes('droidcam');
        });

        if (!targetDevice) {
          targetDevice = videoDevices.find(d => !d.label.toLowerCase().includes('droidcam'));
        }

        await startCamera(targetDevice ? targetDevice.deviceId : null);
      } catch (err) {
        console.error('System initialization error:', err);
        startCamera(null);
      }
    };

    initializeSystem();

    return () => {
      pose.close();
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Empty dependency array is critical to avoid restarting the camera

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000' }}>
      <video ref={videoRef} autoPlay playsInline muted style={{ position: 'absolute', width: '1280px', height: '720px', visibility: 'hidden', zIndex: -1 }} />
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
          transition: 'filter 0.5s ease',
          opacity: isCameraReady ? 1 : 0
        }} 
      />
      {!isCameraReady && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', fontFamily: 'Share Tech Mono', zIndex: 10 }}>
          <div className="pulse-dot green" style={{ width: '20px', height: '20px', marginBottom: '15px' }} />
          <div style={{ fontSize: '18px', letterSpacing: '4px' }}>INITIALIZING NEURAL LINK...</div>
          <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '10px', color: '#8b949e' }}>AWAITING CAMERA STREAM</div>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 20, left: 20, background: 'rgba(0,0,0,0.5)', padding: '5px 10px', fontSize: '10px', color: '#8b949e', fontFamily: 'Share Tech Mono' }}>
        LATENCY: 42ms | FPS: 30 | CORE: SENTINEL-X
      </div>
    </div>
  );
};

export default CameraFeed;
