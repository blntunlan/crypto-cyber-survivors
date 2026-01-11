/**
 * MobileSection - Mobile Controls Settings Component
 *
 * Controls for mobile-specific settings like joystick, haptic feedback.
 */

import { memo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import {
  type ControlType,
  type JoystickPosition,
  type JoystickSize,
} from '../../types/MobileSettings';
import { ToggleButton } from './ToggleButton';
import { IconSmartphone } from '../icons/CardIcons';

export const MobileSection = memo(() => {
  const mobile = useGameStore(state => state.mobile);
  const setMobileSetting = useGameStore(state => state.setMobileSetting);

  return (
    <section className="space-y-3 md:space-y-4">
      <h3 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
        <IconSmartphone className="w-3.5 h-3.5" color="#64748b" />
        <span>Mobile Controls</span>
      </h3>
      <div className="space-y-3 md:space-y-4 bg-white/5 p-3 md:p-4 rounded-xl border border-white/5">
        {/* Control Type Selection */}
        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase">
            Control Type
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMobileSetting('controlType', 'drag' as ControlType)}
              className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                mobile.controlType === 'drag'
                  ? 'bg-yellow-500 text-black'
                  : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
              }`}
            >
              Drag
            </button>
            <button
              onClick={() => setMobileSetting('controlType', 'joystick' as ControlType)}
              className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                mobile.controlType === 'joystick'
                  ? 'bg-yellow-500 text-black'
                  : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
              }`}
            >
              Joystick
            </button>
          </div>
        </div>

        {/* Joystick Settings (only shown when joystick is selected) */}
        {mobile.controlType === 'joystick' && (
          <>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase">
                Joystick Size
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['small', 'medium', 'large'] as JoystickSize[]).map(size => (
                  <button
                    key={size}
                    onClick={() => setMobileSetting('joystickSize', size)}
                    className={`py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      mobile.joystickSize === size
                        ? 'bg-yellow-500 text-black'
                        : 'bg-white/5 text-slate-400 border border-white/5'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase">
                Joystick Side
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(['left', 'right'] as JoystickPosition[]).map(pos => (
                  <button
                    key={pos}
                    onClick={() => setMobileSetting('joystickPosition', pos)}
                    className={`py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      mobile.joystickPosition === pos
                        ? 'bg-yellow-500 text-black'
                        : 'bg-white/5 text-slate-400 border border-white/5'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Feedback Toggles */}
        <ToggleButton
          label="Haptic Feedback"
          enabled={mobile.hapticFeedback}
          onToggle={() => setMobileSetting('hapticFeedback', !mobile.hapticFeedback)}
        />
        <ToggleButton
          label="Visual Feedback"
          enabled={mobile.showDragFeedback}
          onToggle={() =>
            setMobileSetting('showDragFeedback', !mobile.showDragFeedback)
          }
        />
      </div>
    </section>
  );
});

MobileSection.displayName = 'MobileSection';
