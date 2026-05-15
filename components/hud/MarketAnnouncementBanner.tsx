/**
 * MarketAnnouncementBanner - Displays market event announcements as banners.
 *
 * Listens to EventBus `marketAnnouncement` events, maintains a priority queue,
 * and shows one announcement at a time with slide-in animations.
 *
 * Features:
 * - Priority queue: higher priority interrupts current
 * - Auto-dismiss after configured duration
 * - Liquidation warning flashes/pulses
 * - Monospace font with neon glow aesthetic
 * - Responsive: works on mobile and desktop
 */

import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EventBus } from '../../services/core/EventBus';
import { type MarketAnnouncementEvent } from '../../types/events';

// =============================================================================
// TYPES
// =============================================================================

interface QueuedAnnouncement extends MarketAnnouncementEvent {
  id: number;
  expiresAt: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

let nextAnnouncementId = 0;

export const MarketAnnouncementBanner: React.FC = memo(() => {
  const [current, setCurrent] = useState<QueuedAnnouncement | null>(null);
  const queueRef = useRef<QueuedAnnouncement[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEventTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showNext = useCallback(() => {
    clearTimer();

    // Pop highest priority from queue
    if (queueRef.current.length === 0) {
      setCurrent(null);
      return;
    }

    // Sort by priority descending, then by id ascending (FIFO for same priority)
    queueRef.current.sort((a, b) => b.priority - a.priority || a.id - b.id);
    const next = queueRef.current.shift()!;
    setCurrent(next);

    timerRef.current = setTimeout(() => {
      setCurrent(null);
      // Small delay before showing next to allow exit animation
      timerRef.current = setTimeout(() => {
        showNext();
      }, 300);
    }, next.duration);
  }, [clearTimer]);

  useEffect(() => {
    const unsub = EventBus.on('marketAnnouncement', (data: MarketAnnouncementEvent) => {
      const eventTimer = setTimeout(() => {
        pendingEventTimersRef.current.delete(eventTimer);

        const announcement: QueuedAnnouncement = {
          ...data,
          id: nextAnnouncementId++,
          expiresAt: Date.now() + data.duration,
        };

        // High priority (>=10) interrupts current announcement
        if (data.priority >= 10 && current !== null) {
          clearTimer();
          // Push current back to queue if it hasn't expired
          queueRef.current.unshift({
            ...current,
            duration: Math.max(0, current.expiresAt - Date.now()),
          });
          queueRef.current.push(announcement);
          showNext();
          return;
        }

        queueRef.current.push(announcement);

        // If nothing is currently showing, start display
        if (current === null) {
          showNext();
        }
      }, 0);
      pendingEventTimersRef.current.add(eventTimer);
    });

    return () => {
      unsub();
      clearTimer();
    };
  }, [current, clearTimer, showNext]);

  // Cleanup on unmount
  useEffect(() => {
    const pendingEventTimers = pendingEventTimersRef.current;
    return () => {
      clearTimer();
      pendingEventTimers.forEach(timer => clearTimeout(timer));
      pendingEventTimers.clear();
      queueRef.current = [];
    };
  }, [clearTimer]);

  const isLiquidation = current?.type === 'LIQUIDATION_WARNING';

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[130] -translate-x-1/2"
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
            className="flex items-center gap-2 whitespace-nowrap rounded-sm border px-4 py-2 sm:px-6 sm:py-3"
            style={{
              fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              borderColor: current.color,
              boxShadow: `0 0 20px ${current.color}40, 0 0 40px ${current.color}20, inset 0 0 15px ${current.color}10`,
              animation: isLiquidation
                ? 'marketAnnouncePulse 0.5s ease-in-out infinite alternate'
                : undefined,
            }}
          >
            {/* Icon */}
            <span
              className="text-lg sm:text-xl"
              style={{ filter: `drop-shadow(0 0 4px ${current.color})` }}
            >
              {current.icon}
            </span>

            {/* Message */}
            <span
              className="text-xs font-bold uppercase tracking-wider sm:text-sm"
              style={{
                color: current.color,
                textShadow: `0 0 8px ${current.color}, 0 0 16px ${current.color}80`,
              }}
            >
              {current.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
