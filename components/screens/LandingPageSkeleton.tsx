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
    <div className="min-h-screen overflow-hidden bg-[#020617] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-[#d6b85c]/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-[#b22222]/5 blur-[120px]" />
      </div>

      {/* Navigation Skeleton */}
      <nav className="relative z-50 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
        {/* Logo */}
        <div className="flex flex-col gap-1">
          <SkeletonPulse className="h-6 w-20 bg-[#d6b85c]/20" />
          <SkeletonPulse className="h-6 w-24" />
        </div>

        {/* Nav Items */}
        <div className="hidden items-center gap-4 lg:flex">
          <SkeletonPulse className="h-10 w-32 border border-[#d6b85c]/20" />
          <SkeletonPulse className="h-10 w-24 border border-white/10" />
          <SkeletonPulse className="h-10 w-24 border border-white/10" />
          <SkeletonPulse className="h-10 w-24 border border-white/10" />
          <SkeletonPulse className="h-10 w-36 bg-[#d6b85c]/20" />
        </div>

        {/* Mobile menu button */}
        <SkeletonPulse className="h-10 w-10 lg:hidden" />
      </nav>

      {/* Hero Skeleton */}
      <header className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 sm:pb-32 sm:pt-24">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          {/* Left Content */}
          <div className="w-full flex-1">
            {/* Status Badge */}
            <SkeletonPulse className="mb-6 h-6 w-64 border-l-4 border-[#b22222]/30 sm:mb-8" />

            {/* Title */}
            <div className="mb-6 space-y-2 sm:mb-8">
              <SkeletonPulse className="h-12 w-3/4 sm:h-16 lg:h-20" />
              <SkeletonPulse className="h-12 w-1/2 bg-[#d6b85c]/10 sm:h-16 lg:h-20" />
            </div>

            {/* Description */}
            <div className="mb-8 space-y-2 sm:mb-12">
              <SkeletonPulse className="h-4 w-full max-w-xl" />
              <SkeletonPulse className="h-4 w-4/5 max-w-lg" />
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <SkeletonPulse className="h-14 w-full bg-[#d6b85c]/20 sm:w-48" />
              <SkeletonPulse className="h-14 w-full border border-[#b22222]/20 sm:w-40" />
            </div>
          </div>

          {/* Terminal Box */}
          <div className="w-full max-w-lg flex-1 lg:max-w-none">
            <div className="border-2 border-[#b22222]/20 bg-black/50 p-6">
              <div className="mb-4 flex items-center justify-between border-b border-[#b22222]/20 pb-2">
                <div className="flex gap-2">
                  <div className="h-2 w-2 bg-[#b22222]/50" />
                  <div className="h-2 w-2 bg-[#d6b85c]/50" />
                  <div className="h-2 w-2 bg-white/20" />
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
              <div className="mt-4 border-t border-[#b22222]/10 pt-4">
                <SkeletonPulse className="h-1 w-full" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Engineering Section Skeleton */}
      <section className="relative z-10 border-y border-[#b22222]/10 bg-[#b22222]/[0.02] py-20 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Section Header */}
          <div className="mb-12 text-center sm:mb-16 lg:mb-20">
            <SkeletonPulse className="mx-auto mb-4 h-4 w-48 bg-[#d6b85c]/10" />
            <SkeletonPulse className="mx-auto h-10 w-96 max-w-full sm:h-14" />
          </div>

          {/* Cards Grid */}
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="border border-white/5 bg-white/5 p-4 sm:p-6">
                <SkeletonPulse className="mb-3 h-3 w-16 bg-[#b22222]/20 sm:mb-4" />
                <SkeletonPulse className="mb-3 h-6 w-32 sm:mb-4" />
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
      <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2">
        <div className="flex items-center gap-3 border border-[#d6b85c]/30 bg-black/80 px-4 py-2 backdrop-blur-sm">
          <div className="h-2 w-2 animate-ping bg-[#d6b85c]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#d6b85c]">
            Initializing Protocol...
          </span>
        </div>
      </div>
    </div>
  );
};
