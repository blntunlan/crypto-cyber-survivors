import React, { useEffect, useRef } from 'react';
import { EventBus } from '../../services/EventBus';

interface LiveTickerProps {
  id: string;
  valueKey: string;
  formatter?: (val: number) => string;
  className?: string;
  style?: React.CSSProperties;
  initialValue?: string;
}

/**
 * LiveTicker - High-performance DOM-direct text updater.
 * Subscribes to 'hudValuesUpdated' events and updates its text content
 * via Ref without triggering React re-renders.
 */
export const LiveTicker: React.FC<LiveTickerProps> = ({
  valueKey,
  formatter,
  className,
  style,
  initialValue = '--',
}) => {
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Listen to smoothed values from useLerpValues
    const unsubscribe = EventBus.on(
      'hudValuesUpdated',
      (data: Record<string, number>) => {
        if (!textRef.current) return;

        const value = data[valueKey];
        if (value === undefined) return;

        const displayValue = formatter ? formatter(value) : String(value);

        // Direct DOM update (Fastest - bypasses React reconciliation)
        if (textRef.current.textContent !== displayValue) {
          textRef.current.textContent = displayValue;
        }
      }
    );

    return unsubscribe;
  }, [valueKey, formatter]);

  return (
    <span ref={textRef} className={className} style={style}>
      {initialValue}
    </span>
  );
};
