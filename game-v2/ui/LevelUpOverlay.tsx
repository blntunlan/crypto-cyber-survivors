import React from 'react';
import { STARTER_WEAPON_DAMAGE_TIER_2 } from '@/game-v2/config/Mvp0Config';
import { type RunCommand } from '@/game-v2/contracts/RunCommand';

export type LevelUpOverlayProps = {
  damageBefore: number;
  onChoose: (choiceId: RunCommand['choiceId']) => void;
};

export const LevelUpOverlay = ({
  damageBefore,
  onChoose,
}: LevelUpOverlayProps): React.ReactElement => (
  <div className="level-up-overlay" data-testid="level-up-overlay">
    <div
      aria-labelledby="game-v2-level-up-title"
      aria-modal="true"
      className="level-up-dialog"
      role="dialog"
    >
      <h2 className="level-up-title" id="game-v2-level-up-title">
        Level Up
      </h2>
      <div className="level-up-options">
        <button
          type="button"
          className="level-up-choice-button"
          onClick={() => {
            onChoose('starter-damage-2');
          }}
        >
          Increase Damage ({damageBefore} &rarr; {STARTER_WEAPON_DAMAGE_TIER_2})
        </button>
      </div>
    </div>
  </div>
);
