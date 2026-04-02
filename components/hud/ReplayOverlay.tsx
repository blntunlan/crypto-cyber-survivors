/**
 * ReplayOverlay — Playback controls during replay
 */

import React, { useEffect, useState } from 'react';
import { EventBus } from '../../services/core/EventBus';
import { ReplayPlayerService } from '../../services/replay/ReplayPlayerService';

interface ReplayOverlayProps {
  onExit: () => void;
}

export const ReplayOverlay: React.FC<ReplayOverlayProps> = ({ onExit }) => {
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const unsub = EventBus.on('replayTick', data => {
      setProgress(data.progress);
    });
    return () => unsub();
  }, []);

  const formatTime = (pct: number) => {
    const replay = ReplayPlayerService.getReplay();
    if (!replay) return '0:00';
    const ms = pct * replay.duration;
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  const totalTime = () => {
    const replay = ReplayPlayerService.getReplay();
    if (!replay) return '0:00';
    const s = Math.floor(replay.duration / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  const setPlaybackSpeed = (s: number) => {
    setSpeed(s);
    ReplayPlayerService.setSpeed(s);
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(2, 6, 23, 0.9)',
        border: '1px solid #334155',
        borderRadius: 8,
        padding: '8px 16px',
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 100,
      }}
    >
      <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>REPLAY</span>

      <span style={{ color: '#64748b' }}>
        {formatTime(progress)} / {totalTime()}
      </span>

      {/* Progress bar */}
      <div
        style={{ width: 120, height: 4, backgroundColor: '#1e293b', borderRadius: 2 }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, progress * 100)}%`,
            backgroundColor: '#8b5cf6',
            borderRadius: 2,
          }}
        />
      </div>

      {/* Speed buttons */}
      {[1, 2, 4].map(s => (
        <button
          key={s}
          onClick={() => setPlaybackSpeed(s)}
          style={{
            background: speed === s ? '#8b5cf6' : 'none',
            border: `1px solid ${speed === s ? '#8b5cf6' : '#475569'}`,
            color: speed === s ? '#020617' : '#94a3b8',
            padding: '2px 8px',
            fontFamily: 'monospace',
            fontSize: 10,
            cursor: 'pointer',
            borderRadius: 3,
          }}
        >
          {s}x
        </button>
      ))}

      <button
        onClick={onExit}
        style={{
          background: 'none',
          border: '1px solid #ef4444',
          color: '#ef4444',
          padding: '2px 10px',
          fontFamily: 'monospace',
          fontSize: 10,
          cursor: 'pointer',
          borderRadius: 3,
        }}
      >
        EXIT
      </button>
    </div>
  );
};
