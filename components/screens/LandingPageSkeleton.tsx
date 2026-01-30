/**
 * LandingPageSkeleton.tsx - Loading placeholder for LandingPage
 *
 * Shows animated skeleton UI while the main landing page loads.
 * Maintains visual consistency with the Casino-Cyber theme.
 */

import React from 'react';

const SkeletonPulse: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-white/5 ${className}`} />
);

export const LandingPageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#d6b85c]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#b22222]/5 blur-[120px] rounded-full" />
      </div>

      {/* Navigation Skeleton */}
      <nav className="relative z-50 flex items-center justify-between px-4 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8 mx-auto max-w-7xl">
        {/* Logo */}
        <div className="flex flex-col gap-1">
          <SkeletonPulse className="h-6 w-20 bg-[#d6b85c]/20" />
          <SkeletonPulse className="h-6 w-24" />
        </div>

        {/* Nav Items */}
        <div className="hidden lg:flex items-center gap-4">
          <SkeletonPulse className="h-10 w-32 border border-[#d6b85c]/20" />
          <SkeletonPulse className="h-10 w-24 border border-white/10" />
          <SkeletonPulse className="h-10 w-24 border border-white/10" />
          <SkeletonPulse className="h-10 w-24 border border-white/10" />
          <SkeletonPulse className="h-10 w-36 bg-[#d6b85c]/20" />
        </div>

        {/* Mobile menu button */}
        <SkeletonPulse className="lg:hidden h-10 w-10" />
      </nav>

      {/* Hero Skeleton */}
      <header className="relative z-10 px-4 sm:px-6 pt-16 sm:pt-24 pb-24 sm:pb-32 mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="flex-1 w-full">
            {/* Status Badge */}
            <SkeletonPulse className="h-6 w-64 mb-6 sm:mb-8 border-l-4 border-[#b22222]/30" />

            {/* Title */}
            <div className="mb-6 sm:mb-8 space-y-2">
              <SkeletonPulse className="h-12 sm:h-16 lg:h-20 w-3/4" />
              <SkeletonPulse className="h-12 sm:h-16 lg:h-20 w-1/2 bg-[#d6b85c]/10" />
            </div>

            {/* Description */}
            <div className="mb-8 sm:mb-12 space-y-2">
              <SkeletonPulse className="h-4 w-full max-w-xl" />
              <SkeletonPulse className="h-4 w-4/5 max-w-lg" />
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <SkeletonPulse className="h-14 w-full sm:w-48 bg-[#d6b85c]/20" />
              <SkeletonPulse className="h-14 w-full sm:w-40 border border-[#b22222]/20" />
            </div>
          </div>

          {/* Terminal Box */}
          <div className="flex-1 w-full max-w-lg lg:max-w-none">
            <div className="p-6 border-2 border-[#b22222]/20 bg-black/50">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#b22222]/20">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-[#b22222]/50" />
                  <div className="w-2 h-2 bg-[#d6b85c]/50" />
                  <div className="w-2 h-2 bg-white/20" />
                </div>
                <SkeletonPulse className="h-3 w-32" />
              </div>
              <div className="space-y-2">
                <SkeletonPulse className="h-4 w-full" />
                <SkeletonPulse className="h-4 w-4/5" />
                <SkeletonPulse className="h-4 w-3/4" />
                <SkeletonPulse className="h-4 w-2/3" />
                <SkeletonPulse className="h-4 w-3/5 bg-[#d6b85c]/10" />
              </div>
              <div className="mt-4 pt-4 border-t border-[#b22222]/10">
                <SkeletonPulse className="h-1 w-full" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Engineering Section Skeleton */}
      <section className="relative z-10 py-20 sm:py-24 lg:py-32 border-y border-[#b22222]/10 bg-[#b22222]/[0.02]">
        <div className="px-4 sm:px-6 mx-auto max-w-7xl">
          {/* Section Header */}
          <div className="mb-12 sm:mb-16 lg:mb-20 text-center">
            <SkeletonPulse className="h-4 w-48 mx-auto mb-4 bg-[#d6b85c]/10" />
            <SkeletonPulse className="h-10 sm:h-14 w-96 max-w-full mx-auto" />
          </div>

          {/* Cards Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="p-4 sm:p-6 border border-white/5 bg-white/5">
                <SkeletonPulse className="h-3 w-16 mb-3 sm:mb-4 bg-[#b22222]/20" />
                <SkeletonPulse className="h-6 w-32 mb-3 sm:mb-4" />
                <div className="space-y-1">
                  <SkeletonPulse className="h-3 w-full" />
                  <SkeletonPulse className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Loading indicator */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-3 px-4 py-2 bg-black/80 border border-[#d6b85c]/30 backdrop-blur-sm">
          <div className="w-2 h-2 bg-[#d6b85c] animate-ping" />
          <span className="text-[10px] font-mono text-[#d6b85c] uppercase tracking-widest">
            Initializing Protocol...
          </span>
        </div>
      </div>
    </div>
  );
};
