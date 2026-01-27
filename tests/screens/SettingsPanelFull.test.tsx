/**
 * SettingsPanel Full Test Suite
 *
 * Verifies that all sub-sections of the SettingsPanel function correctly.
 */
import { render, fireEvent, screen, act } from '../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsPanel } from '../../components/settings/SettingsPanel';
import { audio } from '../../services/audio';
import { useGameStore } from '../../stores/gameStore';
import { DeviceBenchmarkService } from '../../services/system/DeviceBenchmarkService';
import { screenService } from '../../services/system/ScreenService';
import { DeviceProfile } from '../../types/DeviceProfile';

// --- Mocks ---

// Mock AudioService
vi.mock('../../services/audio', () => ({
  audio: {
    setVolume: vi.fn(),
    getMuted: vi.fn().mockReturnValue(false),
    toggleMute: vi.fn(),
    setCategoryVolume: vi.fn(),
    playToggle: vi.fn(),
    playKeystroke: vi.fn(),
    playSelectionTick: vi.fn(),
  },
}));

// Mock useDevice hook
vi.mock('../../hooks/useDevice', () => ({
  useDevice: vi.fn().mockReturnValue({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    platform: 'windows',
    screen: {
      width: 1920,
      height: 1080,
      isLandscape: true,
      pixelRatio: 1,
      safeArea: { top: 0, bottom: 0, left: 0, right: 0 },
    },
    isIOS: false,
    isAndroid: false,
    isPWA: false,
    hasTouch: false,
  }),
}));

// Mock DeviceBenchmarkService
vi.mock('../../services/system/DeviceBenchmarkService', () => ({
  DeviceBenchmarkService: {
    getPerformanceConfig: vi.fn().mockReturnValue({ profile: 'HIGH' }),
    setManualProfile: vi.fn(),
    resetToAuto: vi.fn(),
    isInManualMode: vi.fn().mockReturnValue(true),
    subscribe: vi.fn().mockReturnValue(() => {}),
  },
}));

// Mock useTheme hook
const mockToggleTheme = vi.fn();
const mockSetTheme = vi.fn(); // Added
const mockTheme = {
  colors: { primary: '#00ff00' },
  displayName: 'Cyberpunk',
};

vi.mock('../../contexts/useTheme', () => ({
  useTheme: () => ({
    themeName: 'cyberpunk',
    toggleTheme: mockToggleTheme,
    setTheme: mockSetTheme, // Added
    theme: mockTheme,
    isRetro: false,
  }),
  useIsRetro: () => false,
}));

// Mock useLanguage hook directly
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key, // Return key as translation
    language: 'en',
    setLanguage: vi.fn(),
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SUPPORTED_LANGUAGES: [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ],
}));

describe('SettingsPanel Full Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useGameStore.setState({
        graphics: {
          showParticles: true,
          showScreenShake: true,
          showDamageNumbers: true,
          showFPS: true,
          hudScale: 1,
          reducedMotion: false,
        },
        audio: {
          masterVolume: 0.5,
          sfxVolume: 1,
          musicVolume: 1,
          isMuted: false,
          categoryVolumes: {
            combat: 1,
            feedback: 1,
            movement: 1,
            ui: 1,
            alerts: 1,
            slots: 1,
            music: 1,
            sfx: 1,
          },
        },
        mobile: {
          controlType: 'joystick',
          joystickSize: 'medium',
          joystickPosition: 'left',
          hapticFeedback: true,
          showDragFeedback: true,
          dashMethod: 'secondTap',
          sensitivity: 1,
        },
      });
    });
  });

  // --- Audio Section Tests ---
  describe('Audio Settings', () => {
    it('should change master volume', () => {
      render(<SettingsPanel onClose={() => {}} />);

      const volumeInputs = screen.getAllByRole('slider');
      const masterSlider = volumeInputs.find(
        i => (i as HTMLInputElement).value === '0.5'
      );

      if (masterSlider) {
        fireEvent.change(masterSlider, { target: { value: '0.8' } });
        expect(useGameStore.getState().audio.masterVolume).toBe(0.8);
        expect(audio.setVolume).toHaveBeenCalledWith(0.8);
      } else {
        throw new Error('Master volume slider not found');
      }
    });

    it('should toggle mute', () => {
      render(<SettingsPanel onClose={() => {}} />);
      const muteBtn = screen.getByText('settings.unmuted');
      fireEvent.click(muteBtn);

      expect(useGameStore.getState().audio.isMuted).toBe(true);
      expect(audio.toggleMute).toHaveBeenCalled();
    });
  });

  // --- Graphics Section Tests ---
  describe('Graphics Settings', () => {
    it('should toggle particles', async () => {
      // Set initial state
      act(() => {
        useGameStore.setState({
          graphics: { ...useGameStore.getState().graphics, showParticles: true },
        });
      });

      render(<SettingsPanel onClose={vi.fn()} />);

      // Look for the translation key since our mock returns keys
      const btn = screen.getByText('settings.particles').closest('button');
      expect(btn).toBeInTheDocument();

      fireEvent.click(btn!);

      expect(useGameStore.getState().graphics.showParticles).toBe(false);
    });

    it('should toggle screen shake', async () => {
      act(() => {
        useGameStore.setState({
          graphics: { ...useGameStore.getState().graphics, showScreenShake: true },
        });
      });

      render(<SettingsPanel onClose={vi.fn()} />);

      const btn = screen.getByText('settings.screen_shake').closest('button');
      expect(btn).toBeInTheDocument();

      fireEvent.click(btn!);

      expect(useGameStore.getState().graphics.showScreenShake).toBe(false);
    });
  });

  // --- Quality Section Tests ---
  describe('Quality Settings', () => {
    it('should switch quality profiles', () => {
      render(<SettingsPanel onClose={() => {}} />);

      const lowBtn = screen.getByText('settings.quality_low');
      fireEvent.click(lowBtn);

      expect(DeviceBenchmarkService.setManualProfile).toHaveBeenCalledWith(
        DeviceProfile.LOW
      );
    });

    it('should reset to auto', () => {
      render(<SettingsPanel onClose={() => {}} />);

      const autoBtn = screen.getByText('settings.quality_auto');
      fireEvent.click(autoBtn);

      expect(DeviceBenchmarkService.resetToAuto).toHaveBeenCalled();
    });
  });

  // --- Theme Section Tests ---
  describe('Theme Settings', () => {
    it('should attempt to toggle theme', () => {
      render(<SettingsPanel onClose={() => {}} />);

      const retroBtn = screen.getByText('settings.theme_retro');
      const button = retroBtn.closest('button');
      expect(button).toBeInTheDocument();

      fireEvent.click(button!);

      expect(mockSetTheme).toHaveBeenCalled();
    });
  });

  // --- Mobile Section Tests ---
  describe('Mobile Settings', () => {
    it('should render mobile section when isMobile is true', async () => {
      const { useDevice } = await import('../../hooks/useDevice');
      (useDevice as any).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        platform: 'android',
        screen: { width: 800, height: 600, safeArea: {} },
        hasTouch: true,
      });
      screenService.isMobile = vi.fn().mockReturnValue(true);

      const { getByText } = render(<SettingsPanel onClose={() => {}} />);
      expect(getByText('settings.mobile')).toBeTruthy();
    });

    it('should change control type', async () => {
      const { useDevice } = await import('../../hooks/useDevice');
      (useDevice as any).mockReturnValue({
        isMobile: true,
        isTablet: false,
        platform: 'android',
        screen: { width: 800, height: 600, safeArea: {} },
        hasTouch: true,
      });
      screenService.isMobile = vi.fn().mockReturnValue(true);

      const { getByText } = render(<SettingsPanel onClose={() => {}} />);
      const dragBtn = getByText('settings.control_drag');
      fireEvent.click(dragBtn);

      expect(useGameStore.getState().mobile.controlType).toBe('drag');
    });
  });

  // --- Sound Mixer Tests ---
  describe('Sound Mixer', () => {
    it('should update category volume', () => {
      render(<SettingsPanel onClose={() => {}} />);

      const combatLabel = screen.getByText('settings.cat_combat');
      const container = combatLabel.closest('div')?.parentElement;
      const slider = container?.querySelector('input[type="range"]');

      if (slider) {
        fireEvent.change(slider, { target: { value: '0.2' } });
        expect(useGameStore.getState().audio.categoryVolumes.combat).toBe(0.2);
        expect(audio.setCategoryVolume).toHaveBeenCalledWith('combat', 0.2);
      } else {
        throw new Error('Combat volume slider not found');
      }
    });
  });

  // --- Reset Tests ---
  describe('Reset and Close', () => {
    it('should reset settings', () => {
      act(() => {
        useGameStore.getState().toggleParticles(); // false
      });
      render(<SettingsPanel onClose={() => {}} />);

      const resetBtn = screen.getByText('settings.reset');
      fireEvent.click(resetBtn);

      expect(useGameStore.getState().graphics.showParticles).toBe(true);
    });

    it('should call onClose', () => {
      const onCloseSpy = vi.fn();
      render(<SettingsPanel onClose={onCloseSpy} />);

      const closeBtn = screen.getByText('settings.close');
      fireEvent.click(closeBtn);

      expect(onCloseSpy).toHaveBeenCalled();
    });
  });
});
