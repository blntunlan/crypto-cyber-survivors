/**
 * ChallengeProgressHUD — In-game challenge objective progress
 */

import React, { useEffect, useState } from 'react';
import { EventBus } from '../../services/core/EventBus';
import { ChallengeService } from '../../services/challenges/ChallengeService';
import { type ChallengeObjective } from '../../types/challenge';

export const ChallengeProgressHUD: React.FC = () => {
  const [objectives, setObjectives] = useState<ChallengeObjective[]>([]);

  useEffect(() => {
    const challenge = ChallengeService.getActiveChallenge();
    if (!challenge) return;
    setObjectives(ChallengeService.getObjectives());

    const unsub = EventBus.on('challengeObjectiveUpdate', () => {
      setObjectives([...ChallengeService.getObjectives()]);
    });
    return () => unsub();
  }, []);

  if (objectives.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(2, 6, 23, 0.8)',
        border: '1px solid #334155',
        borderRadius: 6,
        padding: '6px 10px',
        fontFamily: 'monospace',
        fontSize: 10,
        color: '#e2e8f0',
        minWidth: 140,
        zIndex: 50,
      }}
    >
      <div
        style={{
          color: '#eab308',
          fontSize: 9,
          marginBottom: 4,
          letterSpacing: '0.1em',
        }}
      >
        CHALLENGE
      </div>
      {objectives.map((obj, i) => {
        const pct = Math.min(100, (obj.current / obj.target) * 100);
        return (
          <div key={i} style={{ marginBottom: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: obj.completed ? '#22c55e' : '#94a3b8' }}>
                {obj.type.replace(/_/g, ' ')}
              </span>
              <span>
                {obj.current}/{obj.target}
              </span>
            </div>
            <div
              style={{
                height: 3,
                backgroundColor: '#1e293b',
                borderRadius: 2,
                marginTop: 2,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  backgroundColor: obj.completed ? '#22c55e' : '#eab308',
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
