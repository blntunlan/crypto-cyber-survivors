/**
 * SettingsPanel Screen Tests
 *
 * Verifies that the settings panel correctly synchronizes UI state with
 * the background audio services and game store.
 */
import { render } from '../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsPanel } from '../../components/settings/SettingsPanel';
import { audio } from '../../services/AudioService';
import { useGameStore } from '../../stores/gameStore';

// Mock audio service
vi.mock('../../services/AudioService', () => ({
  audio: {
    setVolume: vi.fn(),
    getMuted: vi.fn().mockReturnValue(false),
    toggleMute: vi.fn(),
    setCategoryVolume: vi.fn(),
  },
}));

/**
 * Suite for testing Audio Synchronization in SettingsPanel.
 */
describe('SettingsPanel - Audio Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state if needed, but since we're testing the side effect in useEffect
    // we mostly care about the initial render and updates.
  });

  it('should sync master volume to audio service on mount', () => {
    const { masterVolume } = useGameStore.getState().audio;

    render(<SettingsPanel onClose={() => {}} />);

    // useEffect should call setVolume with the current store value
    expect(audio.setVolume).toHaveBeenCalledWith(masterVolume);
  });

  it('should call setVolume when master volume changes', () => {
    const { rerender } = render(<SettingsPanel onClose={() => {}} />);

    // Simulate store change
    // Note: In a real test we'd use the provider, but since we're testing the component's
    // internal useEffect dependency on the store, we can trigger a re-render or
    // rely on the component subscribing to the store.

    // Changing the store directly:
    useGameStore.getState().setMasterVolume(0.5);

    // Rerender to trigger useEffect if it didn't automatically (it should via the hook)
    rerender(<SettingsPanel onClose={() => {}} />);

    expect(audio.setVolume).toHaveBeenCalledWith(0.5);
  });

  it('should sync muted state to audio service', () => {
    // Set store to muted
    useGameStore.getState().toggleMute(); // Now true
    vi.mocked(audio.getMuted).mockReturnValue(false); // Service thinks it's not muted

    render(<SettingsPanel onClose={() => {}} />);

    // Since they differ, toggleMute should be called
    expect(audio.toggleMute).toHaveBeenCalled();
  });
});
