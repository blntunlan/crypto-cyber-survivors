/**
 * ToggleButton - Reusable Toggle Switch Component
 *
 * A simple on/off toggle button with smooth animation.
 */

import React from 'react';
import { audio } from '../../services/audio';

export interface ToggleButtonProps {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  isFocused?: boolean;
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({
  label,
  enabled,
  onToggle,
  isFocused = false,
}) => (
  <button
    onClick={() => {
      audio.playToggle();
      onToggle();
    }}
    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 transition-all hover:bg-white/5 ${
      isFocused
        ? 'bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.3)] ring-2 ring-white'
        : ''
    }`}
  >
    <span className="text-sm font-bold text-white">{label}</span>
    <div
      className={`relative h-5 w-10 rounded-full transition-all ${
        enabled ? 'bg-green-500' : 'bg-slate-600'
      }`}
    >
      <div
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-md transition-all ${
          enabled ? 'left-5' : 'left-0.5'
        }`}
      />
    </div>
  </button>
);
