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
import { useLanguage } from '../../contexts/LanguageContext';

export const MobileSection = memo(
  ({
    focusedItem = null,
  }: {
    focusedItem?:
      | 'control-drag'
      | 'control-joystick'
      | 'size-small'
      | 'size-medium'
      | 'size-large'
      | 'side-left'
      | 'side-right'
      | 'haptic'
      | 'visual'
      | null;
  }) => {
    const mobile = useGameStore(state => state.mobile);
    const setMobileSetting = useGameStore(state => state.setMobileSetting);
    const { t } = useLanguage();

    return (
      <section className="space-y-3 md:space-y-4">
        <h3 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <IconSmartphone className="w-3.5 h-3.5" color="#64748b" />
          <span>{t('settings.mobile')}</span>
        </h3>

        <div className="space-y-3 md:space-y-4 bg-white/5 p-3 md:p-4 rounded-xl border border-white/5">
          {/* Control Type Selection */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {t('settings.control_type')}
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMobileSetting('controlType', 'drag' as ControlType)}
                className={`py-2 rounded-lg text-xs font-bold uppercase transition-all border ${
                  mobile.controlType === 'drag'
                    ? 'bg-yellow-500 text-black border-yellow-400 font-black'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                } ${focusedItem === 'control-drag' ? 'ring-2 ring-white scale-105 z-10' : ''}`}
              >
                {t('settings.control_drag')}
              </button>

              <button
                onClick={() =>
                  setMobileSetting('controlType', 'joystick' as ControlType)
                }
                className={`py-2 rounded-lg text-xs font-bold uppercase transition-all border ${
                  mobile.controlType === 'joystick'
                    ? 'bg-yellow-500 text-black border-yellow-400 font-black'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                } ${focusedItem === 'control-joystick' ? 'ring-2 ring-white scale-105 z-10' : ''}`}
              >
                {t('settings.control_joystick')}
              </button>
            </div>
          </div>

          {/* Joystick Settings (only shown when joystick is selected) */}
          {mobile.controlType === 'joystick' && (
            <>
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  {t('settings.joystick_size')}
                </span>

                <div className="grid grid-cols-3 gap-2">
                  {(['small', 'medium', 'large'] as JoystickSize[]).map(size => (
                    <button
                      key={size}
                      onClick={() => setMobileSetting('joystickSize', size)}
                      className={`py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                        mobile.joystickSize === size
                          ? 'bg-yellow-500 text-black border-yellow-400 font-black'
                          : 'bg-white/5 text-slate-400 border-white/5'
                      } ${focusedItem === `size-${size}` ? 'ring-2 ring-white scale-105 z-10' : ''}`}
                    >
                      {t(`settings.size_${size}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  {t('settings.joystick_side')}
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {(['left', 'right'] as JoystickPosition[]).map(pos => (
                    <button
                      key={pos}
                      onClick={() => setMobileSetting('joystickPosition', pos)}
                      className={`py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                        mobile.joystickPosition === pos
                          ? 'bg-yellow-500 text-black border-yellow-400 font-black'
                          : 'bg-white/5 text-slate-400 border-white/5'
                      } ${focusedItem === `side-${pos}` ? 'ring-2 ring-white scale-105 z-10' : ''}`}
                    >
                      {t(`settings.side_${pos}`)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Feedback Toggles */}
          <div className="space-y-1 pt-1">
            <ToggleButton
              label={t('settings.haptic_feedback')}
              enabled={mobile.hapticFeedback}
              onToggle={() =>
                setMobileSetting('hapticFeedback', !mobile.hapticFeedback)
              }
              isFocused={focusedItem === 'haptic'}
            />

            <ToggleButton
              label={t('settings.visual_feedback')}
              enabled={mobile.showDragFeedback}
              onToggle={() =>
                setMobileSetting('showDragFeedback', !mobile.showDragFeedback)
              }
              isFocused={focusedItem === 'visual'}
            />
          </div>
        </div>
      </section>
    );
  }
);

MobileSection.displayName = 'MobileSection';
