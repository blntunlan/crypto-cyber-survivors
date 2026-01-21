/**
 * @fileoverview Tutorial Spotlight Component
 * Creates a spotlight effect highlighting specific elements
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './TutorialSpotlight.css';

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TutorialSpotlightProps {
  /** CSS selector for the element to highlight */
  selector: string | undefined;
  /** Padding around the highlighted element */
  padding?: number;
  /** Whether clicks should pass through to the highlighted element */
  clickThrough?: boolean;
  /** Callback when clicking outside the spotlight */
  onClickOutside?: () => void;
}

/**
 * Creates a full-screen overlay with a spotlight cutout
 * Uses SVG mask for smooth spotlight effect
 */
export const TutorialSpotlight: React.FC<TutorialSpotlightProps> = ({
  selector,
  padding = 8,
  clickThrough = false,
  onClickOutside,
}) => {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }

    const updateRect = (): void => {
      const element = document.querySelector(selector);
      if (element) {
        const domRect = element.getBoundingClientRect();
        setRect({
          x: domRect.left - padding,
          y: domRect.top - padding,
          width: domRect.width + padding * 2,
          height: domRect.height + padding * 2,
        });
      } else {
        setRect(null);
      }
    };

    // Initial measurement
    updateRect();

    // Update on resize/scroll
    const observer = new ResizeObserver(updateRect);
    observer.observe(document.body);

    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [selector, padding]);

  const handleOverlayClick = (e: React.MouseEvent): void => {
    if (!clickThrough && onClickOutside) {
      // Check if click is outside the spotlight
      if (rect) {
        const clickX = e.clientX;
        const clickY = e.clientY;
        const isInside =
          clickX >= rect.x &&
          clickX <= rect.x + rect.width &&
          clickY >= rect.y &&
          clickY <= rect.y + rect.height;

        if (!isInside) {
          onClickOutside();
        }
      } else {
        onClickOutside();
      }
    }
  };

  return (
    <AnimatePresence>
      {selector && (
        <motion.div
          ref={overlayRef}
          className="tutorial-spotlight-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleOverlayClick}
          style={{
            pointerEvents: clickThrough ? 'none' : 'auto',
          }}
        >
          <svg
            className="tutorial-spotlight-svg"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
          >
            <defs>
              <mask id="spotlight-mask">
                {/* White = visible, Black = hidden */}
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {rect && (
                  <motion.rect
                    initial={{ opacity: 0, scale: 1.2 }}
                    animate={{
                      x: rect.x,
                      y: rect.y,
                      width: rect.width,
                      height: rect.height,
                      opacity: 1,
                      scale: 1,
                    }}
                    transition={{
                      x: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                      y: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                      width: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                      height: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                      opacity: { duration: 0.3 },
                      scale: { duration: 0.4 },
                    }}
                    rx="12"
                    ry="12"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.85)"
              mask="url(#spotlight-mask)"
            />
          </svg>

          {/* Pulse ring around spotlight */}
          {rect && (
            <motion.div
              className="tutorial-spotlight-ring"
              initial={false}
              animate={{
                left: rect.x - 6,
                top: rect.y - 6,
                width: rect.width + 12,
                height: rect.height + 12,
                boxShadow: [
                  '0 0 0 0 rgba(0, 212, 255, 0.5)',
                  '0 0 0 15px rgba(0, 212, 255, 0)',
                ],
              }}
              transition={{
                left: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                top: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                width: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                height: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                boxShadow: {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeOut',
                },
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TutorialSpotlight;
