import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Shield, AlertTriangle, Activity, Database, Settings, Terminal, ShieldAlert, User, Maximize, Minimize } from 'lucide-react';
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
  
  // New Control States
  const [isLockdown, setIsLockdown] = useState(false);
  const [isSilentMode, setIsSilentMode] = useState(false);
  const [isThermalView, setIsThermalView] = useState(false);
  const [isMotionTracking, setIsMotionTracking] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  const addLog = (log) => {
    setLogs(prev => [{
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      ...log
    }, ...prev].slice(0, 50));
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
                src="/avatar.png" 
                alt="AI Core" 
                className="avatar-image" 
                onError={(e) => { 
                  e.target.style.display='none'; 
                  e.target.nextSibling.style.display='flex'; 
                }} 
              />
              <div className="avatar-fallback" style={{display: 'none', width: '100%', height: '100%', backgroundColor: 'var(--bg-dark)', alignItems: 'center', justifyContent: 'center', borderRadius: '50%'}}>
                 <User size={20} color="var(--accent-primary)" />
              </div>
            </div>
            <div className="profile-info">
              <span className="profile-name">SYS-CORE</span>
              <span className="profile-role">Neural Link</span>
            </div>
          </div>

          <button className="btn-cyber" onClick={toggleFullScreen} title="Plein écran">
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button className="btn-cyber" onClick={() => setIsSettingsOpen(true)}><Settings size={16} /></button>
        </div>
      </header>

      <main className="main-feed">
        <CameraFeed 
          onAnomaly={handleAnomaly} 
          isAnomaly={isAnomaly || isLockdown} 
          isThermalView={isThermalView}
          isMotionTracking={isMotionTracking}
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
        <AnalysisPanel logs={logs} aiAnalysis={aiAnalysis} />
        
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
              Lockdown
            </button>
            <button 
              className={`btn-cyber ${isSilentMode ? 'active' : ''}`} 
              onClick={toggleSilentMode}
            >
              Silent Mode
            </button>
            <button 
              className={`btn-cyber ${isThermalView ? 'active' : ''}`} 
              onClick={() => setIsThermalView(!isThermalView)}
            >
              Thermal View
            </button>
            <button 
              className={`btn-cyber ${isMotionTracking ? 'active' : ''}`} 
              onClick={() => setIsMotionTracking(!isMotionTracking)}
            >
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
