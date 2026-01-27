/**
 * SettingsPanel Screen Tests
 *
 * Verifies that the settings panel correctly synchronizes UI state with
 * the background audio services and game store.
 */
import { render, act } from '../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsPanel } from '../../components/settings/SettingsPanel';
import { audio } from '../../services/audio';
import { useGameStore } from '../../stores/gameStore';

// Mock audio service
vi.mock('../../services/audio', () => ({
  audio: {
    setVolume: vi.fn(),
    getMuted: vi.fn().mockReturnValue(false),
    toggleMute: vi.fn(),
    setCategoryVolume: vi.fn(),
  },
}));

// Mock LanguageContext
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SUPPORTED_LANGUAGES: [{ code: 'en', name: 'English', flag: '🇺🇸' }],
}));

/**
 * Suite for testing Audio Synchronization in SettingsPanel.
 */
describe('SettingsPanel - Audio Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    act(() => {
      useGameStore.getState().resetSettings();
    });
  });

  it('should sync master volume to audio service on mount', () => {
    const { masterVolume } = useGameStore.getState().audio;

    render(<SettingsPanel onClose={() => {}} />);

    // useEffect should call setVolume with the current store value
    expect(audio.setVolume).toHaveBeenCalledWith(masterVolume);
  });

  it('should call setVolume when master volume changes', async () => {
    let renderResult: any;
    await act(async () => {
      renderResult = render(<SettingsPanel onClose={() => {}} />);
    });

    const { rerender } = renderResult;

    // Simulate store change
    await act(async () => {
      useGameStore.getState().setMasterVolume(0.5);
    });

    // Rerender to trigger useEffect if it didn't automatically
    await act(async () => {
      rerender(<SettingsPanel onClose={() => {}} />);
    });

    expect(audio.setVolume).toHaveBeenCalledWith(0.5);
  });

  it('should sync muted state to audio service', () => {
    // Set store to muted
    act(() => {
      useGameStore.getState().toggleMute(); // Now true
    });
    vi.mocked(audio.getMuted).mockReturnValue(false); // Service thinks it's not muted

    render(<SettingsPanel onClose={() => {}} />);

    // Since they differ, toggleMute should be called
    expect(audio.toggleMute).toHaveBeenCalled();
  });
});
