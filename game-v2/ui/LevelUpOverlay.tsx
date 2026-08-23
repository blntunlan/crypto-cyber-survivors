import React, { useEffect, useRef, useState } from 'react';
import {
  LEVEL_UP_OFFER_COUNTDOWN_SECONDS,
  LEVEL_UP_OFFER_REVEAL_SECONDS,
  LEVEL_UP_OFFER_TOTAL_SECONDS,
} from '@/game-v2/config/Mvp0Config';
import { type LevelUpOfferReadout } from '@/game-v2/contracts/GameV2Debug';
import { type OfferCandidateIndex } from '@/game-v2/contracts/LevelUpOffer';
import { formatOfferCandidateLabel } from '@/game-v2/ui/LevelUpOfferLabel';

const TOTAL_MS = LEVEL_UP_OFFER_TOTAL_SECONDS * 1000;
const REVEAL_MS = LEVEL_UP_OFFER_REVEAL_SECONDS * 1000;
const COUNTDOWN_START_MS = TOTAL_MS - LEVEL_UP_OFFER_COUNTDOWN_SECONDS * 1000;
const TICK_INTERVAL_MS = 100;

const KEY_TO_CANDIDATE_INDEX: Readonly<Record<string, OfferCandidateIndex>> = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Numpad1: 0,
  Numpad2: 1,
  Numpad3: 2,
};

const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export type LevelUpOverlayProps = {
  offer: LevelUpOfferReadout;
  onChoose: (index: OfferCandidateIndex) => void;
};

/**
 * The real 13-second card flow (design §5.4, V2-ADR-054).
 *
 * The countdown is a real-time interval independent of the simulation clock;
 * the runtime accepts a resolution at any point once the lifecycle is
 * `level-up`, so this component owns the reveal/choosing/countdown/timeout
 * presentation entirely and is never exercised by replay. Reroll and banish
 * are `V2-105`.
 */
export const LevelUpOverlay = ({
  offer,
  onChoose,
}: LevelUpOverlayProps): React.ReactElement => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const resolvedRef = useRef(false);
  const reducedMotionRef = useRef(prefersReducedMotion());

  useEffect(() => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, TICK_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const revealing = elapsedMs < REVEAL_MS;
  const showCountdown = elapsedMs >= COUNTDOWN_START_MS;
  const remainingSeconds = Math.max(0, Math.ceil((TOTAL_MS - elapsedMs) / 1000));

  const resolve = (index: OfferCandidateIndex): void => {
    if (resolvedRef.current || revealing) {
      return;
    }
    resolvedRef.current = true;
    onChoose(index);
  };

  useEffect(() => {
    if (!resolvedRef.current && elapsedMs >= TOTAL_MS) {
      resolvedRef.current = true;
      onChoose(offer.defaultIndex);
    }
  }, [elapsedMs, offer.defaultIndex, onChoose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const index = KEY_TO_CANDIDATE_INDEX[event.code];
      if (index !== undefined && offer.candidates[index] !== null) {
        resolve(index);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  return (
    <div className="level-up-overlay" data-testid="level-up-overlay">
      <div
        aria-labelledby="game-v2-level-up-title"
        aria-modal="true"
        className={
          revealing && !reducedMotionRef.current
            ? 'level-up-dialog level-up-dialog--revealing'
            : 'level-up-dialog'
        }
        role="dialog"
      >
        <h2 className="level-up-title" id="game-v2-level-up-title">
          Level Up
        </h2>
        {showCountdown ? (
          <div className="level-up-countdown" data-testid="level-up-countdown">
            {remainingSeconds}
          </div>
        ) : null}
        <div className="level-up-options">
          {offer.candidates.map((candidate, index) => {
            if (candidate === null) {
              return null;
            }

            return (
              <button
                key={index}
                type="button"
                className="level-up-choice-button"
                data-testid={`level-up-card-${index}`}
                disabled={revealing}
                onClick={() => {
                  resolve(index as OfferCandidateIndex);
                }}
              >
                {formatOfferCandidateLabel(candidate)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
