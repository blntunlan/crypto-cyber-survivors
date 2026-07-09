/**
 * ChallengeProgressHUD — In-game challenge objective progress
 */

import React, { useEffect, useState } from 'react';
import { EventBus } from '../../services/core/EventBus';
import { ChallengeService } from '../../services/challenges/ChallengeService';
import { type ChallengeObjective } from '../../types/challenge';
import { HudGhostRail } from './HudGhostRail';

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
    <div className="absolute right-2 top-2 z-50 min-w-[140px] font-mono text-[10px] text-slate-200">
      <HudGhostRail
        testId="challenge-progress-rail"
        side="right"
        tone="gold"
        className="py-1"
      >
        <div className="mb-1 text-[9px] tracking-[0.1em] text-[#D6B85C]">CHALLENGE</div>
        {objectives.map(obj => {
          const pct = Math.min(100, (obj.current / obj.target) * 100);
          return (
            <div key={obj.type} className="mb-1">
              <div className="flex justify-between gap-3">
                <span className={obj.completed ? 'text-[#6EE7B7]' : 'text-slate-300'}>
                  {obj.type.replace(/_/g, ' ')}
                </span>
                <span>
                  {obj.current}/{obj.target}
                </span>
              </div>
              <div className="mt-0.5 h-[3px] border-y border-white/25">
                <div
                  className="h-full transition-[width] duration-300 motion-reduce:transition-none"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: obj.completed ? '#6EE7B7' : '#D6B85C',
                  }}
                />
              </div>
            </div>
          );
        })}
      </HudGhostRail>
    </div>
  );
};
