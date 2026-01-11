import { useState, useEffect, useCallback } from 'react';
import { audio } from '../services/AudioService';

interface UseMenuNavOptions {
  itemsCount: number;
  direction?: 'vertical' | 'horizontal';
  loop?: boolean;
  onSelect?: (index: number) => void;
  onBack?: () => void;
  enabled?: boolean;
}

export const useMenuNav = ({
  itemsCount,
  direction = 'vertical',
  loop = true,
  onSelect,
  onBack,
  enabled = true,
}: UseMenuNavOptions) => {
  // -1 means no selection initially (optional), but let's default to 0
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Skip keyboard navigation if user is typing in an input or textarea
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const nextKey = direction === 'vertical' ? 'ArrowDown' : 'ArrowRight';
      const prevKey = direction === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
      // WS keys for vertical, AD for horizontal
      const nextKeyAlt = direction === 'vertical' ? 's' : 'd';
      const prevKeyAlt = direction === 'vertical' ? 'w' : 'a';

      if (
        e.key === nextKey ||
        e.key === nextKeyAlt ||
        e.key === nextKeyAlt.toUpperCase()
      ) {
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev + 1;
          if (next >= itemsCount) return loop ? 0 : prev;
          // TODO: Add distinct navigation sound, reusing button click for now but quieter if possible?
          // Since we can't easily modulate volume here without deeper access, we'll just skip sound for nav traverse
          // or use a very generic subtle sound if available.
          // For now, no sound on traverse to avoid spam, or finding a suitable one later.
          return next;
        });
      } else if (
        e.key === prevKey ||
        e.key === prevKeyAlt ||
        e.key === prevKeyAlt.toUpperCase()
      ) {
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev - 1;
          if (next < 0) return loop ? itemsCount - 1 : prev;
          return next;
        });
      } else if (e.key === 'Enter' || e.key === ' ') {
        // Space is also common for confirmation
        e.preventDefault();
        if (onSelect) {
          audio.playButton();
          onSelect(selectedIndex);
        }
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        if (onBack) {
          e.preventDefault();
          onBack();
        }
      }
    },
    [enabled, itemsCount, direction, loop, onSelect, onBack, selectedIndex] // selectedIndex dependency for onSelect
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    selectedIndex,
    setSelectedIndex, // Allow manual focus override (e.g. mouse hover)
  };
};
