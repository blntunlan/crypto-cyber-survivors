import React from 'react';
import { audio } from '../../services/AudioService';
import { useGameStore, selectAudio } from '../../stores/gameStore';
import { useDevice } from '../../hooks/useDevice';
import { screenService } from '../../services/ScreenService';
import { DeviceBenchmarkService } from '../../services/DeviceBenchmarkService';
import { DeviceProfile } from '../../types/DeviceProfile';
import { useIsRetro, useTheme } from '../../contexts/useTheme';
import { COLORS } from '../../constants';
import { Z_LAYERS } from '../../constants/ZIndex';

// Section components
import { AudioSection } from './AudioSection';
import { SoundMixerSection } from './SoundMixerSection';
import { QualitySection } from './QualitySection';
import { GraphicsSection } from './GraphicsSection';
import { MobileSection } from './MobileSection';
import { ControlsSection } from './ControlsSection';
import { ThemeSection } from './ThemeSection';
import { LanguageSection } from './LanguageSection';
import { useLanguage, SUPPORTED_LANGUAGES } from '../../contexts/LanguageContext';

interface SettingsPanelProps {
  onClose: () => void;
  /** If true, hides theme section (theme can only be changed from main menu) */
  isInGame?: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  onClose,
  isInGame = false,
}) => {
  const resetSettings = useGameStore(state => state.resetSettings);
  const audioSettings = useGameStore(selectAudio);
  const device = useDevice();
  const isMobile = screenService.isMobile();
  const isRetro = useIsRetro();
  const { toggleTheme } = useTheme();
  const { t } = useLanguage();

  // Sync audio service with store
  React.useEffect(() => {
    // 🚀 [Turbo Console Log]: audioSettings sync
    // console.log('SettingsPanel.tsx:37 ~ audioSettings:', audioSettings);

    audio.setVolume(audioSettings.masterVolume);
    if (audioSettings.isMuted !== audio.getMuted()) {
      audio.toggleMute();
    }
  }, [audioSettings.masterVolume, audioSettings.isMuted]);

  const showMobileSection = device.isMobile || device.isTablet;

  // Keyboard Navigation
  // Index mapping:
  // 0: Theme toggle (if not in game)
  // 1: Quality profile
  // 2: Master volume
  // 3: Mute toggle
  // 4-9: Sound mixer categories
  // 10: Particles toggle
  // 11: Screen shake toggle
  // 12: Damage numbers toggle
  // 13: Reset button
  // 14: Close button
  const { language, setLanguage } = useLanguage();
  const [focusedIndex, setFocusedIndex] = React.useState<number>(isInGame ? 0 : 0);

  // Adjust max index based on whether theme section is shown
  const THEME_OFFSET = isInGame ? 0 : 1;
  const LANG_INDEX = THEME_OFFSET;
  const SECTION_OFFSET = THEME_OFFSET + 1; // Start of other sections after Language
  const MAX_INDEX = 13 + SECTION_OFFSET;

  // Refs for scroll-into-view functionality
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const focusableRefs = React.useRef<Map<number, HTMLElement>>(new Map());

  // Scroll focused item into view when focusedIndex changes
  React.useEffect(() => {
    const element = focusableRefs.current.get(focusedIndex);
    if (element && scrollContainerRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [focusedIndex]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CRITICAL: Stop immediate propagation to prevent Hub Menu from receiving these events
      // This must run in capture phase (see addEventListener below)
      e.stopImmediatePropagation();

      // Don't prevent default for everything, only navigation keys
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'w',
          'a',
          's',
          'd',
          ' ',
          'Enter',
          'Escape',
        ].includes(e.key)
      ) {
        e.preventDefault();
      }

      // Adjusted indices accounting for theme and language
      const languageIdx = LANG_INDEX;
      const qualityIdx = SECTION_OFFSET;
      const volumeIdx = SECTION_OFFSET + 1;
      const muteIdx = SECTION_OFFSET + 2;
      const mixerStartIdx = SECTION_OFFSET + 3;
      const particlesIdx = SECTION_OFFSET + 9;
      const shakeIdx = SECTION_OFFSET + 10;
      const damageIdx = SECTION_OFFSET + 11;
      const resetIdx = SECTION_OFFSET + 12;
      const closeIdx = SECTION_OFFSET + 13;

      // Use the variables to avoid lint errors
      void languageIdx;

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
          if (focusedIndex === 0 && !isInGame) {
            // Theme toggle via left arrow
            toggleTheme();
          } else if (focusedIndex === qualityIdx) {
            const profiles = Object.values(DeviceProfile);
            const current = DeviceBenchmarkService.getPerformanceConfig().profile;
            const idx = profiles.indexOf(current);
            if (idx > -1) {
              const prev = (idx - 1 + profiles.length) % profiles.length;
              DeviceBenchmarkService.setManualProfile(profiles[prev]!);
            }
          } else if (focusedIndex === volumeIdx) {
            const newVol = Math.max(0, audioSettings.masterVolume - 0.05);
            useGameStore.getState().setMasterVolume(newVol);
          } else if (focusedIndex === languageIdx) {
            const currentIdx = SUPPORTED_LANGUAGES.indexOf(language);
            const prevIdx =
              (currentIdx - 1 + SUPPORTED_LANGUAGES.length) %
              SUPPORTED_LANGUAGES.length;
            setLanguage(SUPPORTED_LANGUAGES[prevIdx]!);
          } else if (
            focusedIndex >= mixerStartIdx &&
            focusedIndex < mixerStartIdx + 6
          ) {
            // Sound Mixer
            const categories: (keyof typeof audioSettings.categoryVolumes)[] = [
              'combat',
              'feedback',
              'movement',
              'ui',
              'alerts',
              'slots',
            ];
            const category = categories[focusedIndex - mixerStartIdx]!;
            const currentVol = audioSettings.categoryVolumes[category];
            useGameStore
              .getState()
              .setCategoryVolume(category, Math.max(0, currentVol - 0.05));
          }
          break;

        case 'ArrowRight':
        case 'd':
        case 'D':
          if (focusedIndex === 0 && !isInGame) {
            // Theme toggle via right arrow
            toggleTheme();
          } else if (focusedIndex === qualityIdx) {
            const profiles = Object.values(DeviceProfile);
            const current = DeviceBenchmarkService.getPerformanceConfig().profile;
            const idx = profiles.indexOf(current);
            if (idx > -1) {
              const next = (idx + 1) % profiles.length;
              DeviceBenchmarkService.setManualProfile(profiles[next]!);
            }
          } else if (focusedIndex === volumeIdx) {
            const newVol = Math.min(1, audioSettings.masterVolume + 0.05);
            useGameStore.getState().setMasterVolume(newVol);
          } else if (focusedIndex === languageIdx) {
            const currentIdx = SUPPORTED_LANGUAGES.indexOf(language);
            const nextIdx = (currentIdx + 1) % SUPPORTED_LANGUAGES.length;
            setLanguage(SUPPORTED_LANGUAGES[nextIdx]!);
          } else if (
            focusedIndex >= mixerStartIdx &&
            focusedIndex < mixerStartIdx + 6
          ) {
            // Sound Mixer
            const categories: (keyof typeof audioSettings.categoryVolumes)[] = [
              'combat',
              'feedback',
              'movement',
              'ui',
              'alerts',
              'slots',
            ];
            const category = categories[focusedIndex - mixerStartIdx]!;
            const currentVol = audioSettings.categoryVolumes[category];
            useGameStore
              .getState()
              .setCategoryVolume(category, Math.min(1, currentVol + 0.05));
          }
          break;

        case 'Enter':
        case ' ':
          if (focusedIndex === 0 && !isInGame) {
            toggleTheme();
          } else if (focusedIndex === muteIdx) {
            useGameStore.getState().toggleMute();
          } else if (focusedIndex === particlesIdx) {
            useGameStore.getState().toggleParticles();
          } else if (focusedIndex === shakeIdx) {
            useGameStore.getState().toggleScreenShake();
          } else if (focusedIndex === damageIdx) {
            useGameStore.getState().toggleDamageNumbers();
          } else if (focusedIndex === resetIdx) {
            resetSettings();
          } else if (focusedIndex === closeIdx) {
            onClose();
          }
          break;

        case 'Escape':
          onClose();
          break;
      }
    };

    // Use capture phase to intercept events BEFORE Hub Menu receives them
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [
    focusedIndex,
    audioSettings,
    onClose,
    resetSettings,
    isInGame,
    THEME_OFFSET,
    LANG_INDEX,
    SECTION_OFFSET,
    MAX_INDEX,
    toggleTheme,
    language,
    setLanguage,
  ]);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 md:p-6 ${isRetro ? 'bg-black/90' : 'bg-slate-950/90 backdrop-blur-xl'}`}
      style={{
        zIndex: Z_LAYERS.SETTINGS_PANEL,
        paddingTop: `calc(${isMobile ? '1rem' : '2rem'} + env(safe-area-inset-top, 0px))`,
        paddingBottom: `calc(${isMobile ? '1rem' : '2rem'} + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <div
        className={`max-w-md w-full p-4 md:p-8 flex flex-col max-h-full transition-all ${
          isRetro
            ? 'bg-zinc-900 border-4 border-[var(--color-primary)] rounded-none'
            : 'cyber-glass rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]'
        }`}
      >
        {/* Header */}
        <header className="text-center mb-4 md:mb-8 shrink-0">
          <h2
            className={`${isRetro ? 'font-retro-pixel' : 'font-cyber cyber-glitch-text'} text-2xl md:text-3xl font-black text-white italic tracking-tighter uppercase`}
            style={{
              textShadow: isRetro ? `4px 4px 0px ${COLORS.SLOT_BLACK}` : 'none',
            }}
          >
            {t('settings.title')}
          </h2>

          <div
            className={`h-1 mx-auto mt-2 ${isRetro ? 'w-24' : 'w-12 bg-[var(--color-primary)] rounded-full opacity-50'}`}
            style={{ backgroundColor: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
          />
        </header>

        {/* Settings Sections */}
        <div
          ref={scrollContainerRef}
          className="space-y-4 md:space-y-6 overflow-y-auto pr-2 custom-scrollbar"
        >
          {!isInGame && (
            <div
              ref={el => {
                if (el) focusableRefs.current.set(0, el);
              }}
            >
              <ThemeSection isFocused={focusedIndex === 0} />
            </div>
          )}
          <div
            ref={el => {
              if (el) focusableRefs.current.set(LANG_INDEX, el);
            }}
          >
            <LanguageSection isFocused={focusedIndex === LANG_INDEX} />
          </div>
          <div
            ref={el => {
              if (el) focusableRefs.current.set(SECTION_OFFSET, el);
            }}
          >
            <QualitySection isFocused={focusedIndex === SECTION_OFFSET} />
          </div>
          <div
            ref={el => {
              if (el) focusableRefs.current.set(SECTION_OFFSET + 1, el);
            }}
          >
            <AudioSection
              focusedItem={
                focusedIndex === SECTION_OFFSET + 1
                  ? 'volume'
                  : focusedIndex === SECTION_OFFSET + 2
                    ? 'mute'
                    : null
              }
            />
          </div>
          <div
            ref={el => {
              if (el) focusableRefs.current.set(SECTION_OFFSET + 3, el);
            }}
          >
            <SoundMixerSection
              focusedCategory={
                focusedIndex === SECTION_OFFSET + 3
                  ? 'combat'
                  : focusedIndex === SECTION_OFFSET + 4
                    ? 'feedback'
                    : focusedIndex === SECTION_OFFSET + 5
                      ? 'movement'
                      : focusedIndex === SECTION_OFFSET + 6
                        ? 'ui'
                        : focusedIndex === SECTION_OFFSET + 7
                          ? 'alerts'
                          : focusedIndex === SECTION_OFFSET + 8
                            ? 'slots'
                            : null
              }
            />
          </div>
          {showMobileSection && <MobileSection />}
          <div
            ref={el => {
              if (el) focusableRefs.current.set(SECTION_OFFSET + 9, el);
            }}
          >
            <GraphicsSection
              isMobile={showMobileSection}
              focusedToggle={
                focusedIndex === SECTION_OFFSET + 9
                  ? 'particles'
                  : focusedIndex === SECTION_OFFSET + 10
                    ? 'shake'
                    : focusedIndex === SECTION_OFFSET + 11
                      ? 'damage'
                      : null
              }
            />
          </div>

          <ControlsSection />
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-3 pt-4 md:pt-6 shrink-0 mt-auto">
          <button
            ref={el => {
              if (el) focusableRefs.current.set(SECTION_OFFSET + 12, el);
            }}
            onClick={resetSettings}
            className={`flex-1 py-3 font-black uppercase text-[10px] tracking-widest transition-all border ${
              isRetro
                ? 'bg-zinc-700 text-white border-zinc-900 rounded-none border-b-2 active:translate-y-0.5'
                : 'bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 hover:text-white border-slate-700 shadow-sm'
            } ${focusedIndex === SECTION_OFFSET + 12 ? (isRetro ? 'bg-zinc-600 ring-2 ring-yellow-400' : 'ring-2 ring-white scale-105 bg-slate-700 text-white') : ''}`}
          >
            {t('settings.reset')}
          </button>

          <button
            ref={el => {
              if (el) focusableRefs.current.set(SECTION_OFFSET + 13, el);
            }}
            onClick={onClose}
            className={`flex-[2] py-3 font-black uppercase tracking-[0.2em] text-sm transition-all ${
              isRetro
                ? 'text-black rounded-none border-b-4 border-yellow-700 active:translate-y-1 active:border-b-0'
                : 'bg-white text-black rounded-xl hover:bg-yellow-500 shadow-lg shadow-white/5'
            } ${focusedIndex === SECTION_OFFSET + 13 ? (isRetro ? 'scale-[1.02] ring-2 ring-white' : 'bg-yellow-500 scale-[1.02] shadow-[0_0_25px_rgba(234,179,8,0.5)]') : ''}`}
            style={{ backgroundColor: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
          >
            {t('settings.close')}
          </button>
        </div>

        <p
          className={`text-center text-[8px] font-bold uppercase tracking-[0.5em] mt-3 shrink-0 ${isRetro ? 'text-zinc-500' : 'text-slate-600'}`}
        >
          {t('settings.auto_save')}
        </p>
      </div>
    </div>
  );
};
