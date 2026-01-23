import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as GameSounds from '../../../services/audio/GameSounds';

// Use hoisted to define mock before the vi.mock call
const { mockSynthEngine } = vi.hoisted(() => ({
  mockSynthEngine: {
    isOnCooldown: vi.fn(() => false),
    recordPlay: vi.fn(),
    getVolume: vi.fn(() => 1),
    getEffectiveVolume: vi.fn(() => 0.8),
    playPreset: vi.fn(),
    resetForTesting: vi.fn(),
  },
}));

vi.mock('../../../services/audio/SynthEngine', () => ({
  synthEngine: mockSynthEngine,
}));

vi.mock('../../../config/AudioRegistry', () => ({
  getPreset: vi.fn(() => ({
    name: 'mock-preset',
    type: 'square',
    components: [
      {
        type: 'sine',
        frequency: 440,
        envelope: { duration: 0.1, peak: 1, initial: 0 },
      },
    ],
  })),
}));

describe('GameSounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSynthEngine.isOnCooldown.mockReturnValue(false); // Reset to default "not on cooldown"
    mockSynthEngine.resetForTesting();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should play shoot sound with correct parameters', async () => {
    GameSounds.playShoot(2, 1);
    expect(mockSynthEngine.playPreset).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ volumeMultiplier: 0.8 })
    );
  });

  it('should play shoot sound with harmonics for multiple projectiles', async () => {
    GameSounds.playShoot(1, 3);
    expect(mockSynthEngine.playPreset).toHaveBeenCalledTimes(2);
  });

  it('should respect cooldowns for frequent sounds', async () => {
    mockSynthEngine.isOnCooldown.mockReturnValue(true);
    GameSounds.playShoot();
    expect(mockSynthEngine.playPreset).not.toHaveBeenCalled();
  });

  it('should play critical hit sound', async () => {
    GameSounds.playCrit();
    expect(mockSynthEngine.playPreset).toHaveBeenCalled();
  });

  it('should play hit sound', async () => {
    GameSounds.playHit();
    expect(mockSynthEngine.playPreset).toHaveBeenCalled();
  });

  it('should play gem sound', async () => {
    GameSounds.playGem();
    expect(mockSynthEngine.playPreset).toHaveBeenCalled();
  });

  it('should play level up arpeggio', async () => {
    GameSounds.playLevelUp();
    expect(mockSynthEngine.playPreset).toHaveBeenCalledTimes(4);
  });

  it('should play death descending notes', async () => {
    GameSounds.playDeath();
    expect(mockSynthEngine.playPreset).toHaveBeenCalledTimes(3);
  });

  it('should play various UI and game feedback sounds', async () => {
    GameSounds.playDash();
    vi.advanceTimersByTime(100);
    GameSounds.playHeartbeat();
    vi.advanceTimersByTime(100);
    GameSounds.playWhoosh();
    vi.advanceTimersByTime(100);
    GameSounds.playCombo(2);
    vi.advanceTimersByTime(100);
    GameSounds.playWhaleArrival();
    vi.advanceTimersByTime(100);
    GameSounds.playButton();
    vi.advanceTimersByTime(100);
    GameSounds.playSelectionTick();
    vi.advanceTimersByTime(100);
    GameSounds.playKeystroke();
    vi.advanceTimersByTime(100);
    GameSounds.playToggle();
    vi.advanceTimersByTime(100);
    GameSounds.playAchievementGlint();
    vi.advanceTimersByTime(100);
    GameSounds.playPairSelect();

    expect(mockSynthEngine.playPreset).toHaveBeenCalledTimes(11);
  });
});
