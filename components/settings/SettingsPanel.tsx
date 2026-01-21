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
  /** Callback to replay the tutorial (only shown when not in game) */
  onReplayTutorial?: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  onClose,
  isInGame = false,
  onReplayTutorial,
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
  // Keyboard Navigation Index Ranges
  const themeCount = isInGame ? 0 : 2;
  const langCount = SUPPORTED_LANGUAGES.length;
  const qualityCount = 5;
  const audioCount = 2;
  const mixerCount = 6;
  const mobileCount = showMobileSection ? 9 : 0;
  const graphicsCount = showMobileSection ? 5 : 3;

  const THEME_START = 0;
  const LANG_START = themeCount;
  const QUALITY_START = LANG_START + langCount;
  const AUDIO_START = QUALITY_START + qualityCount;
  const MIXER_START = AUDIO_START + audioCount;
  const MOBILE_START = MIXER_START + mixerCount;
  const GRAPHICS_START = MOBILE_START + mobileCount;
  const RESET_INDEX = GRAPHICS_START + graphicsCount;
  const CLOSE_INDEX = RESET_INDEX + 1;

  const MAX_INDEX = CLOSE_INDEX;

  const [focusedIndex, setFocusedIndex] = React.useState<number>(0);

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
          if (focusedIndex === AUDIO_START) {
            const newVol = Math.max(0, audioSettings.masterVolume - 0.05);
            useGameStore.getState().setMasterVolume(newVol);
          } else if (focusedIndex >= MIXER_START && focusedIndex < MIXER_START + 6) {
            const categories: (keyof typeof audioSettings.categoryVolumes)[] = [
              'combat',
              'feedback',
              'movement',
              'ui',
              'alerts',
              'slots',
            ];
            const category = categories[focusedIndex - MIXER_START]!;
            const currentVol = audioSettings.categoryVolumes[category];
            useGameStore
              .getState()
              .setCategoryVolume(category, Math.max(0, currentVol - 0.05));
          }
          break;

        case 'ArrowRight':
        case 'd':
        case 'D':
          if (focusedIndex === AUDIO_START) {
            const newVol = Math.min(1, audioSettings.masterVolume + 0.05);
            useGameStore.getState().setMasterVolume(newVol);
          } else if (focusedIndex >= MIXER_START && focusedIndex < MIXER_START + 6) {
            const categories: (keyof typeof audioSettings.categoryVolumes)[] = [
              'combat',
              'feedback',
              'movement',
              'ui',
              'alerts',
              'slots',
            ];
            const category = categories[focusedIndex - MIXER_START]!;
            const currentVol = audioSettings.categoryVolumes[category];
            useGameStore
              .getState()
              .setCategoryVolume(category, Math.min(1, currentVol + 0.05));
          }
          break;

        case 'Enter':
        case ' ':
          if (!isInGame && focusedIndex === THEME_START) {
            toggleTheme();
          } else if (!isInGame && focusedIndex === THEME_START + 1) {
            toggleTheme();
          } else if (
            focusedIndex >= LANG_START &&
            focusedIndex < LANG_START + langCount
          ) {
            setLanguage(SUPPORTED_LANGUAGES[focusedIndex - LANG_START]!);
          } else if (focusedIndex === QUALITY_START) {
            DeviceBenchmarkService.resetToAuto();
          } else if (
            focusedIndex >= QUALITY_START + 1 &&
            focusedIndex < QUALITY_START + qualityCount
          ) {
            const profiles = Object.values(DeviceProfile);
            DeviceBenchmarkService.setManualProfile(
              profiles[focusedIndex - QUALITY_START - 1]!
            );
          } else if (focusedIndex === AUDIO_START + 1) {
            useGameStore.getState().toggleMute();
          } else if (
            showMobileSection &&
            focusedIndex >= MOBILE_START &&
            focusedIndex < MOBILE_START + mobileCount
          ) {
            const mobileIdx = focusedIndex - MOBILE_START;
            const setMobileSetting = useGameStore.getState().setMobileSetting;
            if (mobileIdx === 0) setMobileSetting('controlType', 'drag');
            else if (mobileIdx === 1) setMobileSetting('controlType', 'joystick');
            else if (mobileIdx === 2) setMobileSetting('joystickSize', 'small');
            else if (mobileIdx === 3) setMobileSetting('joystickSize', 'medium');
            else if (mobileIdx === 4) setMobileSetting('joystickSize', 'large');
            else if (mobileIdx === 5) setMobileSetting('joystickPosition', 'left');
            else if (mobileIdx === 6) setMobileSetting('joystickPosition', 'right');
            else if (mobileIdx === 7) {
              const current = useGameStore.getState().mobile.hapticFeedback;
              setMobileSetting('hapticFeedback', !current);
            } else if (mobileIdx === 8) {
              const current = useGameStore.getState().mobile.showDragFeedback;
              setMobileSetting('showDragFeedback', !current);
            }
          } else if (focusedIndex === GRAPHICS_START) {
            useGameStore.getState().toggleParticles();
          } else if (focusedIndex === GRAPHICS_START + 1) {
            useGameStore.getState().toggleScreenShake();
          } else if (focusedIndex === GRAPHICS_START + 2) {
            useGameStore.getState().toggleDamageNumbers();
          } else if (showMobileSection && focusedIndex === GRAPHICS_START + 4) {
            useGameStore.getState().toggleFPS();
          } else if (focusedIndex === RESET_INDEX) {
            resetSettings();
          } else if (focusedIndex === CLOSE_INDEX) {
            onClose();
          }
          break;

        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [
    focusedIndex,
    audioSettings,
    onClose,
    resetSettings,
    isInGame,
    toggleTheme,
    language,
    setLanguage,
    MAX_INDEX,
    LANG_START,
    QUALITY_START,
    AUDIO_START,
    MIXER_START,
    MOBILE_START,
    GRAPHICS_START,
    RESET_INDEX,
    CLOSE_INDEX,
    langCount,
    qualityCount,
    mixerCount,
    mobileCount,
    graphicsCount,
    showMobileSection,
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
                if (el) {
                  focusableRefs.current.set(THEME_START, el);
                  focusableRefs.current.set(THEME_START + 1, el);
                }
              }}
            >
              <ThemeSection
                focusedItem={
                  focusedIndex === THEME_START
                    ? 'cyberpunk'
                    : focusedIndex === THEME_START + 1
                      ? 'retro-16bit'
                      : null
                }
              />
            </div>
          )}

          <div
            ref={el => {
              if (el) {
                for (let i = 0; i < langCount; i++) {
                  focusableRefs.current.set(LANG_START + i, el);
                }
              }
            }}
          >
            <LanguageSection
              focusedItem={
                focusedIndex >= LANG_START && focusedIndex < LANG_START + langCount
                  ? SUPPORTED_LANGUAGES[focusedIndex - LANG_START]
                  : null
              }
            />
          </div>
          <div
            ref={el => {
              if (el) {
                for (let i = 0; i < qualityCount; i++) {
                  focusableRefs.current.set(QUALITY_START + i, el);
                }
              }
            }}
          >
            <QualitySection
              focusedItem={
                focusedIndex === QUALITY_START
                  ? 'auto'
                  : focusedIndex >= QUALITY_START + 1 &&
                      focusedIndex < QUALITY_START + qualityCount
                    ? Object.values(DeviceProfile)[focusedIndex - QUALITY_START - 1]
                    : null
              }
            />
          </div>

          <div
            ref={el => {
              if (el) {
                focusableRefs.current.set(AUDIO_START, el);
                focusableRefs.current.set(AUDIO_START + 1, el);
              }
            }}
          >
            <AudioSection
              focusedItem={
                focusedIndex === AUDIO_START
                  ? 'volume'
                  : focusedIndex === AUDIO_START + 1
                    ? 'mute'
                    : null
              }
            />
          </div>

          <div
            ref={el => {
              if (el) {
                for (let i = 0; i < mixerCount; i++) {
                  focusableRefs.current.set(MIXER_START + i, el);
                }
              }
            }}
          >
            <SoundMixerSection
              focusedCategory={
                focusedIndex >= MIXER_START && focusedIndex < MIXER_START + mixerCount
                  ? (
                      [
                        'combat',
                        'feedback',
                        'movement',
                        'ui',
                        'alerts',
                        'slots',
                      ] as const
                    )[focusedIndex - MIXER_START]
                  : null
              }
            />
          </div>

          {showMobileSection && (
            <div
              ref={el => {
                if (el) {
                  for (let i = 0; i < mobileCount; i++) {
                    focusableRefs.current.set(MOBILE_START + i, el);
                  }
                }
              }}
            >
              <MobileSection
                focusedItem={
                  focusedIndex >= MOBILE_START &&
                  focusedIndex < MOBILE_START + mobileCount
                    ? (
                        [
                          'control-drag',
                          'control-joystick',
                          'size-small',
                          'size-medium',
                          'size-large',
                          'side-left',
                          'side-right',
                          'haptic',
                          'visual',
                        ] as const
                      )[focusedIndex - MOBILE_START]
                    : null
                }
              />
            </div>
          )}

          <div
            ref={el => {
              if (el) {
                for (let i = 0; i < graphicsCount; i++) {
                  focusableRefs.current.set(GRAPHICS_START + i, el);
                }
              }
            }}
          >
            <GraphicsSection
              isMobile={showMobileSection}
              focusedToggle={
                focusedIndex === GRAPHICS_START
                  ? 'particles'
                  : focusedIndex === GRAPHICS_START + 1
                    ? 'shake'
                    : focusedIndex === GRAPHICS_START + 2
                      ? 'damage'
                      : showMobileSection && focusedIndex === GRAPHICS_START + 3
                        ? 'hudScale'
                        : showMobileSection && focusedIndex === GRAPHICS_START + 4
                          ? 'fps'
                          : null
              }
            />
          </div>

          <ControlsSection />
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-3 pt-4 md:pt-6 shrink-0 mt-auto">
          {/* Replay Tutorial - Only show when not in game */}
          {!isInGame && onReplayTutorial && (
            <button
              onClick={() => {
                onReplayTutorial();
                onClose();
              }}
              className={`flex-1 py-3 font-black uppercase text-[10px] tracking-widest transition-all border ${
                isRetro
                  ? 'bg-cyan-800 text-white border-cyan-900 rounded-none border-b-2 active:translate-y-0.5'
                  : 'bg-cyan-900/50 text-cyan-400 rounded-xl hover:bg-cyan-800/50 hover:text-cyan-300 border-cyan-700/50 shadow-sm'
              }`}
              title={t('tutorial.replay')}
            >
              📖 {t('tutorial.replay')}
            </button>
          )}

          <button
            ref={el => {
              if (el) focusableRefs.current.set(RESET_INDEX, el);
            }}
            onClick={resetSettings}
            className={`flex-1 py-3 font-black uppercase text-[10px] tracking-widest transition-all border ${
              isRetro
                ? 'bg-zinc-700 text-white border-zinc-900 rounded-none border-b-2 active:translate-y-0.5'
                : 'bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 hover:text-white border-slate-700 shadow-sm'
            } ${focusedIndex === RESET_INDEX ? (isRetro ? 'bg-zinc-600 ring-2 ring-yellow-400' : 'ring-2 ring-white scale-105 bg-slate-700 text-white') : ''}`}
          >
            {t('settings.reset')}
          </button>

          <button
            ref={el => {
              if (el) focusableRefs.current.set(CLOSE_INDEX, el);
            }}
            onClick={onClose}
            className={`flex-[2] py-3 font-black uppercase tracking-[0.2em] text-sm transition-all ${
              isRetro
                ? 'text-black rounded-none border-b-4 border-yellow-700 active:translate-y-1 active:border-b-0'
                : 'bg-white text-black rounded-xl hover:bg-yellow-500 shadow-lg shadow-white/5'
            } ${focusedIndex === CLOSE_INDEX ? (isRetro ? 'scale-[1.02] ring-2 ring-white' : 'bg-yellow-500 scale-[1.02] shadow-[0_0_25px_rgba(234,179,8,0.5)]') : ''}`}
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
