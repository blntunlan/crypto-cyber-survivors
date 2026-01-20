/**
 * SettingsPanel Full Test Suite
 *
 * Verifies that all sub-sections of the SettingsPanel function correctly.
 */
import { render, fireEvent, screen } from '../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsPanel } from '../../components/settings/SettingsPanel';
import { audio } from '../../services/AudioService';
import { useGameStore } from '../../stores/gameStore';
import { DeviceBenchmarkService } from '../../services/DeviceBenchmarkService';
import { screenService } from '../../services/ScreenService';
import { DeviceProfile } from '../../types/DeviceProfile';

// --- Mocks ---

// Mock AudioService
vi.mock('../../services/AudioService', () => ({
  audio: {
    setVolume: vi.fn(),
    getMuted: vi.fn().mockReturnValue(false),
    toggleMute: vi.fn(),
    setCategoryVolume: vi.fn(),
  },
}));

// Mock DeviceBenchmarkService
vi.mock('../../services/DeviceBenchmarkService', () => ({
  DeviceBenchmarkService: {
    getPerformanceConfig: vi.fn().mockReturnValue({ profile: 'HIGH' }),
    setManualProfile: vi.fn(),
    resetToAuto: vi.fn(),
    isInManualMode: vi.fn().mockReturnValue(true),
    subscribe: vi.fn().mockReturnValue(() => {}),
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

// Mock useTheme hook
const mockToggleTheme = vi.fn();
const mockTheme = {
  colors: { primary: '#00ff00' },
  displayName: 'Cyberpunk',
};

vi.mock('../../contexts/useTheme', () => ({
  useTheme: () => ({
    themeName: 'cyberpunk',
    toggleTheme: mockToggleTheme,
    theme: mockTheme,
    isRetro: false,
  }),
  useIsRetro: () => false,
}));

describe('SettingsPanel Full Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  // --- Audio Section Tests ---
  describe('Audio Settings', () => {
    it('should change master volume', () => {
      render(<SettingsPanel onClose={() => {}} />);

      const volumeInputs = screen.getAllByRole('slider');
      // Assuming master volume is the first slider or we can find by label if accessible
      // Based on AudioSection.tsx it doesn't have a label for the input itself, but it's near "Master Volume"
      // Let's find by value since we know it's 0.5
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
    it('should toggle particles', () => {
      render(<SettingsPanel onClose={() => {}} />);
      const btn = screen.getByText('settings.particles'); // ToggleButton uses label text
      fireEvent.click(btn);

      expect(useGameStore.getState().graphics.showParticles).toBe(false);
    });

    it('should toggle screen shake', () => {
      render(<SettingsPanel onClose={() => {}} />);
      const btn = screen.getByText('settings.screen_shake');
      fireEvent.click(btn);

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

      // Current mock returns 'cyberpunk', so '16-Bit' button click should trigger toggle
      const retroBtn = screen.getByText('settings.theme_retro');
      fireEvent.click(retroBtn); // Click the closest interactive element (button parent)

      expect(mockToggleTheme).toHaveBeenCalled();
    });
  });

  // --- Mobile Section Tests (only visible on mobile) ---
  describe('Mobile Settings', () => {
    it('should render mobile section when isMobile is true', async () => {
      // Update useDevice mock for this test
      const { useDevice } = await import('../../hooks/useDevice');
      (useDevice as any).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        platform: 'android',
        screen: {
          width: 800,
          height: 600,
          isLandscape: true,
          pixelRatio: 1,
          safeArea: { top: 0, bottom: 0, left: 0, right: 0 },
        },
        hasTouch: true,
      });

      // Also ensure screenService.isMobile returns true (SettingsPanel uses both)
      screenService.isMobile = vi.fn().mockReturnValue(true);

      const { getByText } = render(<SettingsPanel onClose={() => {}} />);
      expect(getByText('settings.mobile')).toBeTruthy();
    });

    it('should change control type', async () => {
      // Mock set for this test too
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

      // There are multiple sliders. Let's find the one for 'Combat'
      // We can find the container with 'Combat' text and find the input inside it
      const combatLabel = screen.getByText('settings.cat_combat');
      const container = combatLabel.closest('div')?.parentElement; // Label is inside a span inside a div inside the container div
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
      // Change some settings first
      useGameStore.getState().toggleParticles(); // false

      render(<SettingsPanel onClose={() => {}} />);

      const resetBtn = screen.getByText('settings.reset');
      fireEvent.click(resetBtn);

      // Should revert to default (particles: true)
      // The resetSettings action in store needs to be verified if it resets to default.
      // Assuming gameStore has a proper resetSettings implementation.
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
