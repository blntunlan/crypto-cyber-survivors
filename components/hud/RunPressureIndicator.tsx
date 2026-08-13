import React, { memo, useEffect, useState } from 'react';
import { EventBus } from '../../services/core/EventBus';
import { useLanguage } from '../../contexts/LanguageContext';
import { HudGhostRail } from './HudGhostRail';

const GREED_TIER_KEYS = [
  'hud.greed_controlled',
  'hud.greed_risk',
  'hud.greed_greed',
  'hud.greed_frenzy',
  'hud.greed_ruin',
  'hud.greed_doom',
] as const;

const RUN_PRESSURE_TEST_ID = 'run-pressure-indicator';

type RunPressureState = {
  doomStacks: number;
  greedLevel: number;
  supportEfficiency: number;
};

const INITIAL_STATE: RunPressureState = {
  doomStacks: 0,
  greedLevel: 0,
  supportEfficiency: 1,
};

/**
 * Contract §8 makes Doom a visible state and §17 requires a greed change to be
 * felt and explained. Both only escalate, so this subscribes to the transition
 * event instead of polling the snapshot at 60 FPS.
 */
const RunPressureIndicatorComponent: React.FC = () => {
  const { t } = useLanguage();
  const [state, setState] = useState<RunPressureState>(INITIAL_STATE);

  useEffect(() => {
    const unsubscribeProgression = EventBus.on(
      'directorProgressionChanged',
      ({ doomStacks, greedLevel, supportEfficiency }) => {
        setState({ doomStacks, greedLevel, supportEfficiency });
      }
    );
    const unsubscribeReset = EventBus.on('gameReset', () => setState(INITIAL_STATE));

    return () => {
      unsubscribeProgression();
      unsubscribeReset();
    };
  }, []);

  if (state.doomStacks === 0 && state.greedLevel === 0) return null;

  const greedTierKey =
    GREED_TIER_KEYS[Math.min(state.greedLevel, GREED_TIER_KEYS.length - 1)] ??
    GREED_TIER_KEYS[0];
  const supportPercent = Math.round(state.supportEfficiency * 100);

  return (
    <HudGhostRail
      testId={RUN_PRESSURE_TEST_ID}
      side="right"
      tone="danger"
      className="flex flex-col items-end gap-1"
    >
      {state.greedLevel > 0 && (
        <div
          data-testid="run-pressure-greed"
          className="font-cyber text-[11px] font-black uppercase tracking-[0.2em] text-amber-300"
        >
          {t(greedTierKey)} · {state.greedLevel}
        </div>
      )}

      {state.doomStacks > 0 && (
        <div
          data-testid="run-pressure-doom"
          className="font-cyber text-[11px] font-black uppercase tracking-[0.2em] text-rose-400"
        >
          {t('hud.doom_stack')} ×{state.doomStacks}
        </div>
      )}

      {state.supportEfficiency < 1 && (
        <div
          data-testid="run-pressure-support"
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400"
        >
          {t('hud.support_efficiency')} {supportPercent}%
        </div>
      )}
    </HudGhostRail>
  );
};

export const RunPressureIndicator = memo(RunPressureIndicatorComponent);
