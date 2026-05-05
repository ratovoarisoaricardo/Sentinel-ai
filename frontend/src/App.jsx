import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Shield, AlertTriangle, Activity, Database, Settings, Terminal, ShieldAlert, User, Maximize, Minimize, Power, Eye, EyeOff, Lock, VolumeX, Thermometer, Crosshair } from 'lucide-react';
import CameraFeed from './components/CameraFeed';
import AnalysisPanel from './components/AnalysisPanel';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const socket = io(BACKEND_URL);

const speakWarning = (text, lang = 'fr-FR') => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.pitch = 0.8; // Futuristic/Deep voice
  window.speechSynthesis.speak(utterance);
};

function App() {
  const [logs, setLogs] = useState([]);
  const [isAnomaly, setIsAnomaly] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [status, setStatus] = useState('SECURE');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  
  // New Control States
  const [isLockdown, setIsLockdown] = useState(false);
  const [isSilentMode, setIsSilentMode] = useState(false);
  const [isThermalView, setIsThermalView] = useState(false);
  const [isMotionTracking, setIsMotionTracking] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSurveillanceActive, setIsSurveillanceActive] = useState(true);
  const [isSystemOnline, setIsSystemOnline] = useState(true);
  const [isBooting, setIsBooting] = useState(true);

  const addLog = (log) => {
    setLogs(prev => [{
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      ...log
    }, ...prev].slice(0, 50));
  };

  useEffect(() => {
    if (isBooting) {
      const timer = setTimeout(() => setIsBooting(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isBooting]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    socket.on('connect', () => {
      console.log('Connected to backend');
      addLog({ type: 'info', message: 'Core system synchronized with neural backend.' });
    });

    socket.on('anomaly_detected', (data) => {
      setIsAnomaly(true);
      if (!isLockdown) {
        setStatus('THREAT DETECTED');
      }
      addLog({ type: 'threat', message: data.message, timestamp: data.timestamp });
      
      // Audible warning if not silent
      if (!isSilentMode) {
        speakWarning("Avertissement. Activité suspecte détectée. Les autorités ont été prévenues.");
      }

      // Auto reset anomaly visual after 3 seconds
      setTimeout(() => {
        setIsAnomaly(false);
        if (!isLockdown) {
          setStatus('MONITORING');
        }
      }, 3000);
    });

    socket.on('ai_analysis', (data) => {
      setAiAnalysis(data);
      addLog({ type: 'ai', message: `AI ANALYSIS: ${data.analysis}`, timestamp: data.timestamp });
    });

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      socket.off('connect');
      socket.off('anomaly_detected');
      socket.off('ai_analysis');
    };
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const toggleLockdown = () => {
    const newState = !isLockdown;
    setIsLockdown(newState);
    setStatus(newState ? 'LOCKDOWN' : 'SECURE');
    addLog({ 
      type: newState ? 'threat' : 'info', 
      message: newState ? 'EMERGENCY LOCKDOWN INITIATED' : 'LOCKDOWN LIFTED. SYSTEM SECURE.' 
    });
    if (newState && !isSilentMode) {
      speakWarning("Alerte rouge. Confinement du système initié.");
    }
  };

  const toggleSilentMode = () => {
    setIsSilentMode(!isSilentMode);
    addLog({ type: 'info', message: !isSilentMode ? 'Silent Mode Engaged.' : 'Audio Restored.' });
  };



  const handleAnomaly = (image) => {
    socket.emit('trigger_anomaly', { image });
  };

  return (
    <div className={`app-container ${isAnomaly ? 'alert-active' : ''} ${isLockdown ? 'lockdown-active' : ''}`}>
      <header>
        <div className="logo-container">
          <Shield className="logo-icon" size={32} />
          <span className="logo-text">SENTINEL AI</span>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div className="status-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className={`pulse-dot ${status === 'SECURE' ? 'green' : 'red'}`} />
            <span style={{ fontSize: '12px', fontWeight: '600', color: status === 'SECURE' ? 'var(--accent-primary)' : 'var(--accent-danger)' }}>
              {status}
            </span>
          </div>
          
          <div className="profile-container">
            <div className="avatar-wrapper">
              <img 
                src="/ai-core.png" 
                alt="AI Core" 
                className="avatar-image ai-breathing" 
              />
            </div>
            <div className="profile-info">
              <span className="profile-name">SYS-CORE</span>
              <span className="profile-role">Neural Link</span>
            </div>
          </div>

          <button 
            className={`btn-cyber ${isSurveillanceActive ? 'active' : 'danger'}`} 
            onClick={() => {
              setIsSurveillanceActive(!isSurveillanceActive);
              addLog({ type: 'info', message: !isSurveillanceActive ? 'AI Surveillance Re-engaged' : 'AI Surveillance Paused' });
            }}
            title={isSurveillanceActive ? "AI Monitor: ON" : "AI Monitor: OFF"}
          >
            {isSurveillanceActive ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          
          <button 
            className="btn-cyber danger-active" 
            onClick={() => {
              setIsSystemOnline(false);
              addLog({ type: 'threat', message: 'SYSTEM CORE SHUTDOWN INITIATED' });
            }}
            title="Shutdown System"
          >
            <Power size={16} />
          </button>

          <button className="btn-cyber" onClick={toggleFullScreen} title="Plein écran">
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button className="btn-cyber" onClick={() => setIsSettingsOpen(true)} title="Settings"><Settings size={16} /></button>
        </div>
      </header>

      <main className="main-feed">
        <CameraFeed 
          onAnomaly={handleAnomaly} 
          isAnomaly={isAnomaly || isLockdown} 
          isThermalView={isThermalView}
          isMotionTracking={isMotionTracking}
          isSurveillanceActive={isSurveillanceActive}
        />
        <div className="feed-overlay" />
        
        <AnimatePresence>
          {isAnomaly && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                position: 'absolute',
                top: '40px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255, 0, 60, 0.9)',
                padding: '10px 20px',
                borderRadius: '4px',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'white',
                fontWeight: 'bold',
                letterSpacing: '2px'
              }}
            >
              <ShieldAlert size={20} />
              CRITICAL ANOMALY DETECTED
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <aside className="side-panel">
        <AnalysisPanel logs={logs} aiAnalysis={aiAnalysis} onLogClick={(log) => setSelectedLog(log)} />
        
        <div className="panel-card" style={{ flexShrink: 0 }}>
          <div className="panel-title">
            <Terminal size={16} />
            System Control
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button 
              className={`btn-cyber ${isLockdown ? 'danger-active' : ''}`} 
              onClick={toggleLockdown}
            >
              <Lock size={16} />
              Lockdown
            </button>
            <button 
              className={`btn-cyber ${isSilentMode ? 'active' : ''}`} 
              onClick={toggleSilentMode}
            >
              <VolumeX size={16} />
              Silent Mode
            </button>
            <button 
              className={`btn-cyber ${isThermalView ? 'active' : ''}`} 
              onClick={() => setIsThermalView(!isThermalView)}
            >
              <Thermometer size={16} />
              Thermal View
            </button>
            <button 
              className={`btn-cyber ${isMotionTracking ? 'active' : ''}`} 
              onClick={() => setIsMotionTracking(!isMotionTracking)}
            >
              <Crosshair size={16} />
              Motion Tracking
            </button>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-dim)', marginTop: 'auto', paddingTop: '10px', fontFamily: '"Share Tech Mono", monospace', opacity: 0.7 }}>
          &copy; {new Date().getFullYear()} Sentinel-AI. All rights reserved.<br/>
          Developed by ratovoarisoaricardo.
        </div>
      </aside>

      <AnimatePresence>
        {isBooting && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'brightness(2)' }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
          >
            <div className="ai-boot-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', borderRadius: 0 }}>
              <img src="/ai-core.png" alt="AI Core" className="ai-boot-image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div className="wave-scanner" style={{ zIndex: 2 }} />
            </div>
            
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: '40px', borderRadius: '20px', backdropFilter: 'blur(10px)', border: '1px solid rgba(191,0,255,0.2)' }}>
              <h1 style={{ fontFamily: 'Share Tech Mono', color: 'var(--accent-primary)', letterSpacing: '8px', fontSize: '36px', textShadow: '0 0 30px #000, 0 0 10px var(--accent-primary)', textAlign: 'center' }}>
                SYSTEM INITIALIZATION
              </h1>
              <div className="progress-bar-container" style={{ width: '500px', height: '8px', marginTop: '30px', boxShadow: '0 0 20px #000', background: 'rgba(0,0,0,0.8)' }}>
                <div className="progress-bar-fill booting-fill" />
              </div>
            </div>
          </motion.div>
        )}

        {!isSystemOnline && !isBooting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000', zIndex: 9998, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
          >
            <div className="ai-boot-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', borderRadius: 0 }}>
              <img src="/ai-core.png" alt="AI Core" className="ai-boot-image" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) brightness(0.4) sepia(1) hue-rotate(-50deg)' }} />
              <div className="wave-scanner" style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 0, 60, 0.4), transparent)', zIndex: 2 }} />
            </div>
            
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.7)', padding: '50px', borderRadius: '20px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,0,60,0.3)' }}>
              <h1 style={{ fontFamily: 'Share Tech Mono', color: 'var(--accent-danger)', letterSpacing: '8px', fontSize: '36px', textShadow: '0 0 30px #000, 0 0 10px var(--accent-danger)' }}>
                SYSTEM OFFLINE
              </h1>
              <p style={{ color: 'var(--text-dim)', marginBottom: '40px', fontSize: '16px' }}>Sentinel-AI core processes have been terminated.</p>
              <button 
                className="btn-cyber danger" 
                style={{ padding: '15px 30px', fontSize: '16px' }}
                onClick={() => {
                  setIsSystemOnline(true);
                  setIsBooting(true);
                  setLogs([]);
                }}
              >
                <Power size={20} /> REBOOT CORE SYSTEM
              </button>
            </div>
          </motion.div>
        )}

        {isSettingsOpen && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="settings-modal"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className="settings-header">
                <div className="settings-title"><Settings size={18} /> System Settings</div>
                <button className="close-btn" onClick={() => setIsSettingsOpen(false)}>X</button>
              </div>
              
              <div className="settings-content">
                <div className="system-info">
                  <strong>SENTINEL KERNEL v2.4.0</strong><br/>
                  UI Frame: React/Framer<br/>
                  AI Engine: MediaPipe/Gemini 1.5<br/>
                  Connection: WebSockets Active
                </div>
                
                <div className="setting-row">
                  <span>Clear Log History</span>
                  <button className="btn-cyber" onClick={() => { setLogs([]); addLog({type: 'info', message: 'Logs cleared.'}) }}>Execute</button>
                </div>
                
                <div className="setting-row">
                  <span>Force Re-sync AI</span>
                  <button className="btn-cyber" onClick={() => window.location.reload()}>Reboot</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedLog && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="settings-modal"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{ maxWidth: '500px' }}
            >
              <div className="settings-header" style={{ borderBottomColor: selectedLog.type === 'threat' ? 'var(--accent-danger)' : 'var(--accent-primary)' }}>
                <div className="settings-title" style={{ color: selectedLog.type === 'threat' ? 'var(--accent-danger)' : 'var(--accent-primary)' }}>
                  <Terminal size={18} /> Log Details
                </div>
                <button className="close-btn" onClick={() => setSelectedLog(null)}>X</button>
              </div>
              
              <div className="settings-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'var(--bg-dark)', padding: '15px', borderRadius: '4px', border: `1px solid ${selectedLog.type === 'threat' ? 'var(--accent-danger)' : 'var(--border-glow)'}` }}>
                  <div style={{ color: 'var(--text-dim)', fontSize: '11px', marginBottom: '8px' }}>
                    TIMESTAMP: {selectedLog.timestamp} | TYPE: {selectedLog.type.toUpperCase()}
                  </div>
                  <div className="text-readable" style={{ color: selectedLog.type === 'threat' ? '#ffccd5' : '#fff' }}>
                    {selectedLog.message}
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Recommended Actions</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    
                    {selectedLog.type === 'threat' && (
                      <>
                        {!isLockdown && (
                          <button className="btn-cyber danger" onClick={() => { toggleLockdown(); setSelectedLog(null); }}>
                            <Lock size={14} /> Engage Lockdown
                          </button>
                        )}
                        {!isSilentMode && (
                          <button className="btn-cyber" onClick={() => { toggleSilentMode(); setSelectedLog(null); }}>
                            <VolumeX size={14} /> Enable Silent Mode
                          </button>
                        )}
                      </>
                    )}

                    {(selectedLog.type === 'ai' || (selectedLog.type === 'info' && selectedLog.message.includes('404'))) && (
                      <button className="btn-cyber" onClick={() => { window.location.reload(); }}>
                        <Power size={14} /> Reboot System Core
                      </button>
                    )}

                    <button className="btn-cyber" onClick={() => { setLogs(prev => prev.filter(l => l.id !== selectedLog.id)); setSelectedLog(null); }} style={{ opacity: 0.8 }}>
                       Delete This Log
                    </button>
                    <button className="btn-cyber" onClick={() => setSelectedLog(null)} style={{ opacity: 0.6, borderStyle: 'dashed' }}>
                       Dismiss
                    </button>

                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .pulse-dot.green {
          background: var(--accent-primary);
          box-shadow: 0 0 10px var(--accent-primary);
          animation: pulse-green 2s infinite;
        }
        .pulse-dot.red {
          background: var(--accent-danger);
          box-shadow: 0 0 10px var(--accent-danger);
          animation: pulse-red-dot 1s infinite;
        }
        @keyframes pulse-green {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        @keyframes pulse-red-dot {
          0% { transform: scale(1); }
          50% { transform: scale(1.5); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export default App;
