import React from 'react';
import { STARTER_WEAPON_DAMAGE_TIER_2 } from '@/game-v2/config/Mvp0Config';
import { PASSIVE_MOVE_SPEED_BY_LEVEL } from '@/game-v2/contracts/PassiveSlot';
import { type RunCommand } from '@/game-v2/contracts/RunCommand';

export type LevelUpOverlayProps = {
  damageBefore: number;
  moveSpeedBefore: number;
  moveSpeedLevel: number;
  moveSpeedUpgradable: boolean;
  onChoose: (choiceId: RunCommand['choiceId']) => void;
};

/**
 * The MVP-0 card with a second fixed choice (V2-ADR-042).
 *
 * It is deliberately not the V2-104 offer: no reveal, no countdown, no timeout
 * choice, and no reroll or banish. It exists so the passive loadout has a real
 * production path instead of being config only tests can reach.
 */
export const LevelUpOverlay = ({
  damageBefore,
  moveSpeedBefore,
  moveSpeedLevel,
  moveSpeedUpgradable,
  onChoose,
}: LevelUpOverlayProps): React.ReactElement => {
  const nextMoveSpeed = PASSIVE_MOVE_SPEED_BY_LEVEL[moveSpeedLevel + 1];

  return (
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
          {moveSpeedUpgradable && nextMoveSpeed !== undefined ? (
            <button
              type="button"
              className="level-up-choice-button"
              onClick={() => {
                onChoose('passive-move-speed');
              }}
            >
              Increase Move Speed ({moveSpeedBefore} &rarr; {nextMoveSpeed})
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
