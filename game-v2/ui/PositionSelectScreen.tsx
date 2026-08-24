import React, { useState } from 'react';

import {
  LEVERAGE_MODES,
  type LeverageMode,
  type PositionSide,
} from '@/game-v2/contracts/PositionContext';

export type PositionSelectScreenProps = {
  /** `null` until the live V2-200 BTC feed (or the `?entryPrice=` override) has a price. */
  livePrice: number | null;
  onStart: (side: PositionSide, leverage: LeverageMode) => void;
};

/**
 * The real pre-run selection screen (`V2-201`, design §2/§3.2): BTC only
 * (`V2-ADR-084`), LONG/SHORT, one of the five leverage modes. Mirrors
 * `LevelUpOverlay.tsx`'s conventions — plain semantic HTML, `data-testid`
 * everywhere, `role="dialog"`/`aria-*`, no new abstraction layer.
 *
 * Start stays disabled until a real price exists: inventing a placeholder
 * price a player could mistake for real data would defeat the point of
 * locking a genuine entry price.
 */
export const PositionSelectScreen = ({
  livePrice,
  onStart,
}: PositionSelectScreenProps): React.ReactElement => {
  const [side, setSide] = useState<PositionSide>('LONG');
  const [leverage, setLeverage] = useState<LeverageMode>(1);

  return (
    <div className="level-up-overlay" data-testid="position-select-overlay">
      <div
        aria-labelledby="game-v2-position-select-title"
        aria-modal="true"
        className="level-up-dialog"
        role="dialog"
      >
        <h2 className="level-up-title" id="game-v2-position-select-title">
          Open a Position
        </h2>

        <div className="position-select-asset" data-testid="position-select-asset">
          BTC/USD
        </div>

        <div className="position-select-price" data-testid="position-select-price">
          {livePrice === null
            ? 'Connecting to market…'
            : `$${livePrice.toLocaleString('en-US')}`}
        </div>

        <div className="position-select-row" data-testid="position-select-side">
          <button
            type="button"
            className={
              side === 'LONG'
                ? 'position-select-toggle position-select-toggle--active'
                : 'position-select-toggle'
            }
            data-testid="position-select-side-long"
            aria-pressed={side === 'LONG'}
            onClick={() => {
              setSide('LONG');
            }}
          >
            LONG
          </button>
          <button
            type="button"
            className={
              side === 'SHORT'
                ? 'position-select-toggle position-select-toggle--active'
                : 'position-select-toggle'
            }
            data-testid="position-select-side-short"
            aria-pressed={side === 'SHORT'}
            onClick={() => {
              setSide('SHORT');
            }}
          >
            SHORT
          </button>
        </div>

        <div className="position-select-row" data-testid="position-select-leverage">
          {LEVERAGE_MODES.map(mode => (
            <button
              key={mode}
              type="button"
              className={
                leverage === mode
                  ? 'position-select-toggle position-select-toggle--active'
                  : 'position-select-toggle'
              }
              data-testid={`position-select-leverage-${mode}`}
              aria-pressed={leverage === mode}
              onClick={() => {
                setLeverage(mode);
              }}
            >
              {mode}×
            </button>
          ))}
        </div>

        <button
          type="button"
          className="level-up-choice-button"
          data-testid="position-select-start"
          disabled={livePrice === null}
          onClick={() => {
            onStart(side, leverage);
          }}
        >
          Start
        </button>
      </div>
    </div>
  );
};

export default PositionSelectScreen;
