import React from 'react';
import { audio } from '../../services/AudioService';
import { useGameStore, selectAudio } from '../../stores/gameStore';
import { useDevice } from '../../hooks/useDevice';
import { screenService } from '../../services/ScreenService';
import { DeviceBenchmarkService } from '../../services/DeviceBenchmarkService';
import { DeviceProfile } from '../../types/DeviceProfile';
import { useIsRetro } from '../../contexts/useTheme';
import { COLORS } from '../../constants';

// Section components
import { AudioSection } from './AudioSection';
import { QualitySection } from './QualitySection';
import { GraphicsSection } from './GraphicsSection';
import { MobileSection } from './MobileSection';
import { ControlsSection } from './ControlsSection';
import { ThemeSection } from './ThemeSection';

interface SettingsPanelProps {
  onClose: () => void;
  /** If true, hides theme section (theme can only be changed from main menu) */
  isInGame?: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, isInGame = false }) => {
  const resetSettings = useGameStore(state => state.resetSettings);
  const audioSettings = useGameStore(selectAudio);
  const device = useDevice();
  const isMobile = screenService.isMobile();
  const isRetro = useIsRetro();

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

  const MAX_INDEX = 7;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();

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
            const profiles = Object.values(DeviceProfile);
            const current = DeviceBenchmarkService.getPerformanceConfig().profile;
            const idx = profiles.indexOf(current);
            if (idx > -1) {
              const prev = (idx - 1 + profiles.length) % profiles.length;
              DeviceBenchmarkService.setManualProfile(profiles[prev]!);
            }
          } else if (focusedIndex === 1) {
            const newVol = Math.max(0, audioSettings.masterVolume - 0.05);
            useGameStore.getState().setMasterVolume(newVol);
          }
          break;

        case 'ArrowRight':
        case 'd':
        case 'D':
          if (focusedIndex === 0) {
            const profiles = Object.values(DeviceProfile);
            const current = DeviceBenchmarkService.getPerformanceConfig().profile;
            const idx = profiles.indexOf(current);
            if (idx > -1) {
              const next = (idx + 1) % profiles.length;
              DeviceBenchmarkService.setManualProfile(profiles[next]!);
            }
          } else if (focusedIndex === 1) {
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
      className={`fixed inset-0 z-[2500] flex items-center justify-center p-4 md:p-6 ${isRetro ? 'bg-black/90' : 'bg-slate-950/90 backdrop-blur-xl'}`}
      style={{
        paddingTop: `calc(${isMobile ? '1rem' : '2rem'} + env(safe-area-inset-top, 0px))`,
        paddingBottom: `calc(${isMobile ? '1rem' : '2rem'} + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <div
        className={`max-w-md w-full p-4 md:p-8 flex flex-col max-h-full transition-all ${
          isRetro
            ? 'bg-zinc-900 border-4 border-white rounded-none'
            : 'bg-slate-900/50 border border-white/10 rounded-2xl md:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)]'
        }`}
      >
        {/* Header */}
        <header className="text-center mb-4 md:mb-8 shrink-0">
          <h2
            className="text-2xl md:text-4xl font-black text-white italic tracking-tighter uppercase"
            style={{ textShadow: isRetro ? '4px 4px 0px #000000' : 'none' }}
          >
            Settings
          </h2>
          <div
            className={`h-1 mx-auto mt-2 ${isRetro ? 'w-24' : 'w-12 bg-yellow-500 rounded-full'}`}
            style={{ backgroundColor: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
          />
        </header>

        {/* Settings Sections */}
        <div className="space-y-4 md:space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          {!isInGame && <ThemeSection />}
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
            className={`flex-1 py-3 font-black uppercase text-[10px] tracking-widest transition-all border ${
              isRetro
                ? 'bg-zinc-700 text-white border-zinc-900 rounded-none border-b-2 active:translate-y-0.5'
                : 'bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 hover:text-white border-slate-700 shadow-sm'
            } ${focusedIndex === 6 ? (isRetro ? 'bg-zinc-600 ring-2 ring-yellow-400' : 'ring-2 ring-white scale-105 bg-slate-700 text-white') : ''}`}
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className={`flex-[2] py-3 font-black uppercase tracking-[0.2em] text-sm transition-all ${
              isRetro
                ? 'text-black rounded-none border-b-4 border-yellow-700 active:translate-y-1 active:border-b-0'
                : 'bg-white text-black rounded-xl hover:bg-yellow-500 shadow-lg shadow-white/5'
            } ${focusedIndex === 7 ? (isRetro ? 'scale-[1.02] ring-2 ring-white' : 'bg-yellow-500 scale-[1.02] shadow-[0_0_25px_rgba(234,179,8,0.5)]') : ''}`}
            style={{ backgroundColor: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
          >
            Close
          </button>
        </div>

        <p
          className={`text-center text-[8px] font-bold uppercase tracking-[0.5em] mt-3 shrink-0 ${isRetro ? 'text-zinc-500' : 'text-slate-600'}`}
        >
          Settings are saved automatically
        </p>
      </div>
    </div>
  );
};
