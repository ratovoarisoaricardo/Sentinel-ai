import React from 'react';
import { Activity, Database, AlertCircle, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AnalysisPanel = ({ logs, aiAnalysis }) => {
  return (
    <>
      <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div className="panel-title">
          <Cpu size={16} />
          AI Neural Insight
        </div>
        <div style={{ minHeight: '100px', background: 'rgba(110, 0, 255, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(110, 0, 255, 0.2)' }}>
          <AnimatePresence mode='wait'>
            {aiAnalysis ? (
              <motion.div
                key={aiAnalysis.timestamp}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{ fontSize: '13px', lineHeight: '1.6', color: '#e6edf3' }}
              >
                <div style={{ color: 'var(--accent-primary)', marginBottom: '5px', fontSize: '11px', fontWeight: 'bold' }}>
                  LATEST ANALYSIS [{aiAnalysis.timestamp}]
                </div>
                {aiAnalysis.analysis}
              </motion.div>
            ) : (
              <div style={{ color: '#8b949e', fontSize: '12px', fontStyle: 'italic', display: 'flex', alignItems: 'center', height: '100%', justifyContent: 'center' }}>
                Waiting for behavioral trigger...
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="panel-card" style={{ flex: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="panel-title">
          <Database size={16} />
          System Logs
        </div>
        <div className="logs-container" style={{ flex: 1, overflowY: 'auto' }}>
          {logs.map(log => (
            <div key={log.id} className={`log-item ${log.type === 'threat' ? 'threat' : ''}`}>
              <div className="timestamp">[{log.timestamp}] {log.type.toUpperCase()}</div>
              <div>{log.message}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default AnalysisPanel;
