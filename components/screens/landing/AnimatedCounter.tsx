import React, { useEffect, useRef } from 'react';
import { useInView, animate } from 'framer-motion';

export interface AnimatedCounterProps {
  from: number;
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  from,
  to,
  duration = 2,
  suffix = '',
  prefix = '',
}) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(nodeRef, { once: true, margin: '-100px' });

  useEffect(() => {
    if (!inView || !nodeRef.current) return;

    const controls = animate(from, to, {
      duration,
      ease: 'easeOut',
      onUpdate: value => {
        if (nodeRef.current) {
          nodeRef.current.textContent = `${prefix}${Math.floor(value).toLocaleString()}${suffix}`;
        }
      },
    });

    return () => controls.stop();
  }, [inView, from, to, duration, suffix, prefix]);

  return (
    <span ref={nodeRef}>
      {prefix}
      {from}
      {suffix}
    </span>
  );
};
