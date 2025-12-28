/**
 * SettingsPanel - Main Settings Container
 *
 * Container component that composes all settings sections.
 * Individual sections are imported from separate files.
 */

import React from 'react';
import { audio } from '../../services/AudioService';
import { useGameStore, selectAudio } from '../../stores/gameStore';
import { useDevice } from '../../hooks/useDevice';
import { screenService } from '../../services/ScreenService';
import { DeviceBenchmarkService } from '../../services/DeviceBenchmarkService';
import { DeviceProfile } from '../../types/DeviceProfile';

// Section components
import { AudioSection } from './AudioSection';
import { QualitySection } from './QualitySection';
import { GraphicsSection } from './GraphicsSection';
import { MobileSection } from './MobileSection';
import { ControlsSection } from './ControlsSection';

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const resetSettings = useGameStore(state => state.resetSettings);
  const audioSettings = useGameStore(selectAudio);
  const device = useDevice();
  const isMobile = screenService.isMobile();

  // Sync audio service with store
  React.useEffect(() => {
    audio.setVolume(audioSettings.masterVolume);
    if (audioSettings.isMuted !== audio.getMuted()) {
      audio.toggleMute();
    }
  }, [audioSettings.masterVolume, audioSettings.isMuted]);

  const showMobileSection = device.isMobile || device.isTablet;

  // Keyboard Navigation
  const [focusedIndex, setFocusedIndex] = React.useState<number>(0);

  // Define item indices for Desktop (simplifying by skipping mobile section content for nav for now)
  // 0: Quality
  // 1: Volume
  // 2: Mute
  // 3: Particles
  // 4: Shake
  // 5: Damage
  // 6: Reset
  // 7: Close
  const MAX_INDEX = 7;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault(); // Capture all keys when settings is open

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          setFocusedIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          setFocusedIndex(prev => Math.min(MAX_INDEX, prev + 1));
          break;

        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (focusedIndex === 0) {
            // Cycle Profile: Auto -> Ultra -> High ...
            const profiles = Object.values(DeviceProfile);
            const current = DeviceBenchmarkService.getPerformanceConfig().profile;
            const idx = profiles.indexOf(current);
            if (idx > -1) {
              const prev = (idx - 1 + profiles.length) % profiles.length;
              DeviceBenchmarkService.setManualProfile(profiles[prev]!);
            }
          } else if (focusedIndex === 1) {
            // Volume Down
            const newVol = Math.max(0, audioSettings.masterVolume - 0.05);
            useGameStore.getState().setMasterVolume(newVol);
          }
          break;

        case 'ArrowRight':
        case 'd':
        case 'D':
          if (focusedIndex === 0) {
            // Cycle Profile
            const profiles = Object.values(DeviceProfile);
            const current = DeviceBenchmarkService.getPerformanceConfig().profile;
            const idx = profiles.indexOf(current);
            if (idx > -1) {
              const next = (idx + 1) % profiles.length;
              DeviceBenchmarkService.setManualProfile(profiles[next]!);
            }
          } else if (focusedIndex === 1) {
            // Volume Up
            const newVol = Math.min(1, audioSettings.masterVolume + 0.05);
            useGameStore.getState().setMasterVolume(newVol);
          }
          break;

        case 'Enter':
        case ' ':
          if (focusedIndex === 2) useGameStore.getState().toggleMute();
          else if (focusedIndex === 3) useGameStore.getState().toggleParticles();
          else if (focusedIndex === 4) useGameStore.getState().toggleScreenShake();
          else if (focusedIndex === 5) useGameStore.getState().toggleDamageNumbers();
          else if (focusedIndex === 6) resetSettings();
          else if (focusedIndex === 7) onClose();
          break;

        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, audioSettings.masterVolume, onClose, resetSettings]);

  return (
    <div
      className="fixed inset-0 z-[2500] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-6"
      style={{
        paddingTop: `calc(${isMobile ? '1rem' : '2rem'} + env(safe-area-inset-top, 0px))`,
        paddingBottom: `calc(${isMobile ? '1rem' : '2rem'} + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <div
        className={`max-w-md w-full bg-slate-900/50 border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-8 flex flex-col max-h-full shadow-[0_0_50px_rgba(0,0,0,0.5)]`}
      >
        {/* Header */}
        <header className="text-center mb-4 md:mb-8 shrink-0">
          <h2 className="text-2xl md:text-4xl font-black text-white italic tracking-tighter uppercase">
            Settings
          </h2>
          <div className="h-1 w-12 bg-yellow-500 mx-auto mt-2 rounded-full" />
        </header>

        {/* Settings Sections */}
        <div className="space-y-4 md:space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          <QualitySection isFocused={focusedIndex === 0} />
          <AudioSection
            focusedItem={focusedIndex === 1 ? 'volume' : focusedIndex === 2 ? 'mute' : null}
          />
          {showMobileSection && <MobileSection />}
          <GraphicsSection
            isMobile={showMobileSection}
            focusedToggle={
              focusedIndex === 3
                ? 'particles'
                : focusedIndex === 4
                  ? 'shake'
                  : focusedIndex === 5
                    ? 'damage'
                    : null
            }
          />
          <ControlsSection />
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-3 pt-4 md:pt-6 shrink-0 mt-auto">
          <button
            onClick={resetSettings}
            className={`flex-1 py-3 bg-slate-800 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-slate-700 hover:text-white transition-all border border-slate-700 ${
              focusedIndex === 6 ? 'ring-2 ring-white scale-105 bg-slate-700 text-white' : ''
            }`}
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className={`flex-[2] py-3 bg-white text-black font-black uppercase tracking-[0.2em] text-xs rounded-xl hover:bg-yellow-500 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] ${
              focusedIndex === 7
                ? 'bg-yellow-500 scale-[1.02] shadow-[0_0_25px_rgba(234,179,8,0.5)]'
                : ''
            }`}
          >
            Close
          </button>
        </div>

        <p className="text-center text-[8px] text-slate-600 font-bold uppercase tracking-[0.5em] mt-3 shrink-0">
          Settings are saved automatically
        </p>
      </div>
    </div>
  );
};
