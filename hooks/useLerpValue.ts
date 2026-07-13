/**
 * useLerpValue - Smooth value interpolation hook
 *
 * Provides smooth transitions between numeric values using linear interpolation.
 * Perfect for UI counters, prices, percentages that shouldn't "jump" instantly.
 */

import { useState, useEffect, useRef } from 'react';
import { lerp } from '../utils/math';
import { EventBus } from '../services/core/EventBus';

interface UseLerpValueOptions {
  /** Interpolation speed (0-1). Higher = faster. Default: 0.1 */
  speed?: number;
  /** Minimum change threshold to trigger interpolation. Default: 0.001 */
  threshold?: number;
  /** Decimal places for rounding. Default: 2 */
  decimals?: number;
  /** Use requestAnimationFrame for smoother updates. Default: true */
  useRAF?: boolean;
}

/**
 * Smoothly interpolate a numeric value over time
 */
export const useLerpValue = (
  targetValue: number,
  options: UseLerpValueOptions = {}
): number => {
  const { speed = 0.1, threshold = 0.001, decimals = 2, useRAF = true } = options;

  const [displayValue, setDisplayValue] = useState(targetValue);
  const currentValueRef = useRef(targetValue);
  const targetValueRef = useRef(targetValue);
  const rafRef = useRef<number | null>(null);

  // Update target when prop changes
  useEffect(() => {
    targetValueRef.current = targetValue;
  }, [targetValue]);

  // lerp imported from utils/math.ts

  // Animation loop
  useEffect(() => {
    if (!useRAF) {
      // Simple interval-based approach
      const interval = setInterval(() => {
        const current = currentValueRef.current;
        const target = targetValueRef.current;
        const diff = Math.abs(target - current);

        if (diff > threshold) {
          const newValue = lerp(current, target, speed);
          currentValueRef.current = newValue;
          setDisplayValue(Number(newValue.toFixed(decimals)));
        } else if (diff > 0) {
          currentValueRef.current = target;
          setDisplayValue(Number(target.toFixed(decimals)));
        }
      }, 16); // ~60fps

      return () => clearInterval(interval);
    }

    // RAF-based approach for smoother updates
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      const current = currentValueRef.current;
      const target = targetValueRef.current;
      const diff = Math.abs(target - current);

      if (diff > threshold) {
        // Adjust speed based on delta time for frame-rate independence
        const adjustedSpeed = Math.min(1, speed * (deltaTime / 16.67));
        const newValue = lerp(current, target, adjustedSpeed);
        currentValueRef.current = newValue;
        setDisplayValue(Number(newValue.toFixed(decimals)));
      } else if (diff > 0) {
        currentValueRef.current = target;
        setDisplayValue(Number(target.toFixed(decimals)));
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [speed, threshold, decimals, useRAF]);

  return displayValue;
};

/**
 * Smoothly interpolate multiple values at once
 */
export const useLerpValues = <T extends Record<string, number>>(
  targetValues: T,
  options: UseLerpValueOptions = {}
): T => {
  const { speed = 0.1, threshold = 0.001, decimals = 2 } = options;

  const currentValuesRef = useRef<T>({ ...targetValues });
  const targetValuesRef = useRef<T>({ ...targetValues });
  const emittedValuesRef = useRef<T>({ ...targetValues });
  const rafRef = useRef<number | null>(null);

  // Update targets when props change
  useEffect(() => {
    for (const key in targetValues) {
      targetValuesRef.current[key] = targetValues[key]!;
    }
  }, [targetValues]);

  // lerp imported from utils/math.ts

  // Animation loop
  useEffect(() => {
    let lastTime = performance.now();
    const roundingFactor = 10 ** decimals;

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      const adjustedSpeed = Math.min(1, speed * (deltaTime / 16.67));
      let hasChanges = false;
      const currentValues = currentValuesRef.current;

      for (const key in targetValuesRef.current) {
        const current = currentValues[key];
        const target = targetValuesRef.current[key];

        if (current === undefined || target === undefined) continue;

        const diff = Math.abs(target - current);

        if (diff > threshold) {
          currentValues[key] = lerp(current, target, adjustedSpeed) as T[Extract<
            keyof T,
            string
          >];
          hasChanges = true;
        } else if (diff > 0) {
          currentValues[key] = target;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        const emittedValues = emittedValuesRef.current;
        for (const key in currentValues) {
          const val = currentValues[key];
          if (val !== undefined) {
            emittedValues[key] = (Math.round(val * roundingFactor) /
              roundingFactor) as T[Extract<keyof T, string>];
          }
        }

        // Performance Optimization: Emit event for direct DOM updates
        // This allows components to use refs instead of re-rendering
        EventBus.emit('hudValuesUpdated', emittedValues as Record<string, number>);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [speed, threshold, decimals]);

  return targetValues;
};
