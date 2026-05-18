/**
 * LazyMotionProvider - Lazy loads framer-motion features
 *
 * This reduces initial bundle size by ~40KB by loading motion features
 * only when needed instead of including them in the main bundle.
 */

import React from 'react';
import { LazyMotion, MotionConfig } from 'framer-motion';
import { getRuntimeDebugFlags } from '../config/RuntimeDebugFlags';

// Dynamically import only the DOM animation features we need
// This is tree-shakeable and loads async
const loadFeatures = () => import('framer-motion').then(mod => mod.domAnimation);

interface LazyMotionProviderProps {
  children: React.ReactNode;
}

export const LazyMotionProvider: React.FC<LazyMotionProviderProps> = ({ children }) => {
  const runtimeDebugFlags = getRuntimeDebugFlags();
  return (
    <LazyMotion features={loadFeatures}>
      <MotionConfig reducedMotion={runtimeDebugFlags.noMotion ? 'always' : 'user'}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
};
