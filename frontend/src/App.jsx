import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Shield, AlertTriangle, Activity, Database, Settings, Terminal, ShieldAlert, User } from 'lucide-react';
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

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to backend');
      addLog({ type: 'info', message: 'Core system synchronized with neural backend.' });
    });

    socket.on('anomaly_detected', (data) => {
      setIsAnomaly(true);
      setStatus('THREAT DETECTED');
      addLog({ type: 'threat', message: data.message, timestamp: data.timestamp });
      
      // Audible warning
      speakWarning("Avertissement. Activité suspecte détectée. Les autorités ont été prévenues.");

      // Auto reset anomaly visual after 3 seconds
      setTimeout(() => {
        setIsAnomaly(false);
        setStatus('MONITORING');
      }, 3000);
    });

    socket.on('ai_analysis', (data) => {
      setAiAnalysis(data);
      addLog({ type: 'ai', message: `AI ANALYSIS: ${data.analysis}`, timestamp: data.timestamp });
    });

    return () => {
      socket.off('connect');
      socket.off('anomaly_detected');
      socket.off('ai_analysis');
    };
  }, []);

  const addLog = (log) => {
    setLogs(prev => [{
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      ...log
    }, ...prev].slice(0, 50));
  };

  const handleFrame = (image) => {
    socket.emit('process_frame', { image });
  };

  return (
    <div className={`app-container ${isAnomaly ? 'alert-active' : ''}`}>
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

          <button className="btn-cyber"><Settings size={16} /></button>
        </div>
      </header>

      <main className="main-feed">
        <CameraFeed onFrame={handleFrame} isAnomaly={isAnomaly} />
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
        
        <div className="panel-card" style={{ flex: 1 }}>
          <div className="panel-title">
            <Terminal size={16} />
            System Control
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button className="btn-cyber">Lockdown</button>
            <button className="btn-cyber">Silent Mode</button>
            <button className="btn-cyber">Thermal View</button>
            <button className="btn-cyber">Motion Tracking</button>
          </div>
        </div>
      </aside>

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
