/**
 * MarketAnnouncementBanner - Displays market event announcements as banners.
 *
 * Listens to EventBus `marketAnnouncement` events and shows the latest relevant
 * announcement with slide-in animations.
 *
 * Features:
 * - Single slot: new market information replaces stale information
 * - Liquidation priority blocks lower-priority interruptions
 * - Auto-dismiss after configured duration
 * - Liquidation warning flashes/pulses
 * - Monospace font with neon glow aesthetic
 * - Responsive: works on mobile and desktop
 */

import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EventBus } from '../../services/core/EventBus';
import { type MarketAnnouncementEvent } from '../../types/events';
import { HudEventRail } from './HudGhostRail';

// =============================================================================
// TYPES
// =============================================================================

interface ActiveAnnouncement extends MarketAnnouncementEvent {
  id: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

let nextAnnouncementId = 0;

export const MarketAnnouncementBanner: React.FC = memo(() => {
  const [current, setCurrent] = useState<ActiveAnnouncement | null>(null);
  const currentRef = useRef<ActiveAnnouncement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleAnnouncement = useCallback(
    (data: MarketAnnouncementEvent) => {
      const activeAnnouncement = currentRef.current;
      if (
        activeAnnouncement &&
        activeAnnouncement.priority >= 10 &&
        data.priority < 10
      ) {
        return;
      }

      clearTimer();
      const announcement: ActiveAnnouncement = {
        ...data,
        id: nextAnnouncementId++,
      };
      currentRef.current = announcement;
      setCurrent(announcement);

      timerRef.current = setTimeout(() => {
        if (currentRef.current?.id !== announcement.id) return;
        currentRef.current = null;
        timerRef.current = null;
        setCurrent(null);
      }, data.duration);
    },
    [clearTimer]
  );

  useEffect(
    () => EventBus.on('marketAnnouncement', handleAnnouncement),
    [handleAnnouncement]
  );

  useEffect(() => {
    return () => {
      clearTimer();
      currentRef.current = null;
    };
  }, [clearTimer]);

  const isLiquidation = current?.type === 'LIQUIDATION_WARNING';
  const messageParts = current?.message.split(' // ', 2);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed left-1/2 z-[130] max-w-[calc(100vw-1.5rem)] -translate-x-1/2"
      style={{ top: 'calc(2rem + env(safe-area-inset-top, 0px))' }}
    >
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="max-w-full whitespace-nowrap"
            style={{
              fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
            }}
          >
            <HudEventRail
              tone={isLiquidation ? 'danger' : 'gold'}
              className="flex max-w-full items-center gap-2 px-2.5 py-1.5 sm:px-3"
            >
              <span
                aria-hidden="true"
                className="market-announcement-glyph border-r border-white/15 pr-2 text-sm"
                style={{ color: current.color }}
              >
                {current.icon}
              </span>
              <span className="min-w-0 overflow-hidden text-ellipsis text-[11px] uppercase sm:text-xs">
                <span
                  className="market-announcement-label font-extrabold tracking-[0.12em]"
                  style={{ color: current.color }}
                >
                  {messageParts?.[0]}
                </span>
                {messageParts?.[1] && (
                  <>
                    <span aria-hidden="true" className="px-1.5 text-slate-600">
                      /
                    </span>
                    <span className="market-announcement-detail font-semibold tracking-[0.08em] text-slate-300">
                      {messageParts[1]}
                    </span>
                  </>
                )}
              </span>
            </HudEventRail>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
