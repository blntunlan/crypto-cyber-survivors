/**
 * ToggleButton - Reusable Toggle Switch Component
 *
 * A simple on/off toggle button with smooth animation.
 */

import React from 'react';

export interface ToggleButtonProps {
  label: string;
  enabled: boolean;
  onToggle: () => void;
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({ label, enabled, onToggle }) => (
  <button
    onClick={onToggle}
    className="w-full flex justify-between items-center py-2 px-3 rounded-lg hover:bg-white/5 transition-all"
  >
    <span className="text-sm font-bold text-white">{label}</span>
    <div
      className={`w-10 h-5 rounded-full transition-all relative ${
        enabled ? 'bg-green-500' : 'bg-slate-600'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all ${
          enabled ? 'left-5' : 'left-0.5'
        }`}
      />
    </div>
  </button>
);
