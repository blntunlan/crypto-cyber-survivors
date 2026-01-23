import { describe, it, expect, vi, beforeEach } from 'vitest';
import { audio } from '../../../services/audio/AudioService';
import { synthEngine } from '../../../services/audio/SynthEngine';
import { howlerManager } from '../../../services/audio/HowlerManager';
import * as GameSounds from '../../../services/audio/GameSounds';
import * as ComboSounds from '../../../services/audio/ComboSounds';
import * as SlotSounds from '../../../services/audio/SlotMachineSounds';

// Mock dependencies
vi.mock('../../../services/audio/SynthEngine', () => ({
  synthEngine: {
    toggleMute: vi.fn(),
    setVolume: vi.fn(),
    getVolume: vi.fn(() => 0.5),
    getMuted: vi.fn(() => false),
    setCategoryVolume: vi.fn(),
    getCategoryVolume: vi.fn(() => 0.8),
    getCategoryVolumes: vi.fn(() => ({ master: 0.5, music: 0.5, sfx: 0.5, ui: 0.5 })),
  },
}));

vi.mock('../../../services/audio/HowlerManager', () => ({
  howlerManager: {
    setMuted: vi.fn(),
    setVolume: vi.fn(),
    loadSound: vi.fn(),
    playSound: vi.fn(),
    stopSound: vi.fn(),
    unloadAll: vi.fn(),
  },
}));

vi.mock('../../../services/audio/GameSounds', () => ({
  playShoot: vi.fn(),
  playCrit: vi.fn(),
  playHit: vi.fn(),
  playLevelUp: vi.fn(),
  playGem: vi.fn(),
  playDash: vi.fn(),
  playDeath: vi.fn(),
  playHeartbeat: vi.fn(),
  playWhoosh: vi.fn(),
  playCombo: vi.fn(),
  playWhaleArrival: vi.fn(),
  playButton: vi.fn(),
  playSelectionTick: vi.fn(),
  playKeystroke: vi.fn(),
  playToggle: vi.fn(),
  playAchievementGlint: vi.fn(),
  playPairSelect: vi.fn(),
}));

vi.mock('../../../services/audio/SlotMachineSounds', () => ({
  playSlotTick: vi.fn(),
  playReelStop: vi.fn(),
  playSlotWin: vi.fn(),
  playAnticipation: vi.fn(),
  playCoinShower: vi.fn(),
  playNearMiss: vi.fn(),
  playMultiplierChime: vi.fn(),
  playSlowdownTension: vi.fn(),
  playJackpot: vi.fn(),
  playSpinStart: vi.fn(),
}));

vi.mock('../../../services/audio/ComboSounds', () => ({
  playComboMilestone: vi.fn(),
}));

describe('AudioService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Master Controls', () => {
    it('should set master volume on all engines', () => {
      audio.setVolume(0.7);
      expect(synthEngine.setVolume).toHaveBeenCalledWith(0.7);
      expect(howlerManager.setVolume).toHaveBeenCalledWith(0.7);
    });

    it('should toggle mute state', () => {
      // @ts-expect-error: testing
      synthEngine.toggleMute.mockReturnValue(true);
      const result = audio.toggleMute();
      expect(result).toBe(true);
      expect(howlerManager.setMuted).toHaveBeenCalledWith(true);
    });

    it('should return current volume and mute state', () => {
      expect(audio.getVolume()).toBe(0.5);
      expect(audio.getMuted()).toBe(false);
    });
  });

  describe('Game Sounds', () => {
    it('should dispatch playShoot correctly', () => {
      audio.playShoot(2, 3);
      expect(GameSounds.playShoot).toHaveBeenCalledWith(2, 3);
    });

    it('should dispatch simple game sounds', () => {
      audio.playCrit();
      audio.playLevelUp();
      audio.playDeath();
      audio.playGem();
      audio.playDash();
      audio.playHeartbeat();
      audio.playWhoosh();
      audio.playCombo(2);
      audio.playWhaleArrival();
      audio.playButton();
      audio.playSelectionTick();
      audio.playKeystroke();
      audio.playToggle();
      audio.playAchievementGlint();
      audio.playPairSelect();

      expect(GameSounds.playCrit).toHaveBeenCalled();
      expect(GameSounds.playLevelUp).toHaveBeenCalled();
      expect(GameSounds.playDeath).toHaveBeenCalled();
      expect(GameSounds.playGem).toHaveBeenCalled();
      expect(GameSounds.playDash).toHaveBeenCalled();
      expect(GameSounds.playHeartbeat).toHaveBeenCalled();
      expect(GameSounds.playWhoosh).toHaveBeenCalled();
      expect(GameSounds.playCombo).toHaveBeenCalledWith(2);
      expect(GameSounds.playWhaleArrival).toHaveBeenCalled();
      expect(GameSounds.playButton).toHaveBeenCalled();
      expect(GameSounds.playSelectionTick).toHaveBeenCalled();
      expect(GameSounds.playKeystroke).toHaveBeenCalled();
      expect(GameSounds.playToggle).toHaveBeenCalled();
      expect(GameSounds.playAchievementGlint).toHaveBeenCalled();
      expect(GameSounds.playPairSelect).toHaveBeenCalled();
    });
  });

  describe('Slot Sounds', () => {
    it('should dispatch slot tick and reel stop', () => {
      audio.playSlotTick(1.5);
      audio.playReelStop(2);
      expect(SlotSounds.playSlotTick).toHaveBeenCalledWith(1.5);
      expect(SlotSounds.playReelStop).toHaveBeenCalledWith(2);
    });

    it('should dispatch win and jackpot', () => {
      audio.playSlotWin();
      audio.playJackpot();
      expect(SlotSounds.playSlotWin).toHaveBeenCalled();
      expect(SlotSounds.playJackpot).toHaveBeenCalled();
    });
  });

  describe('Category Controls', () => {
    it('should set and get category volumes', () => {
      audio.setCategoryVolume('music', 0.2);
      expect(synthEngine.setCategoryVolume).toHaveBeenCalledWith('music', 0.2);

      expect(audio.getCategoryVolume('music')).toBe(0.8);
    });
  });

  describe('Slot & Combo Advanced', () => {
    it('should dispatch combo milestone sounds', () => {
      audio.playComboMilestone('combo1');
      expect(ComboSounds.playComboMilestone).toHaveBeenCalledWith('combo1');
    });

    it('should dispatch all slot machine effects', () => {
      audio.playAnticipation(0.5);
      audio.playCoinShower();
      audio.playMultiplierChime(2);
      audio.playSlowdownTension();
      audio.playSpinStart();

      expect(SlotSounds.playAnticipation).toHaveBeenCalledWith(0.5);
      expect(SlotSounds.playCoinShower).toHaveBeenCalled();
      expect(SlotSounds.playMultiplierChime).toHaveBeenCalledWith(2);
      expect(SlotSounds.playSlowdownTension).toHaveBeenCalled();
      expect(SlotSounds.playSpinStart).toHaveBeenCalled();
    });
  });

  describe('Howler Management', () => {
    it('should proxy load and play sound', () => {
      audio.loadSound('test', 'test.mp3');
      audio.playSound('test');
      expect(howlerManager.loadSound).toHaveBeenCalledWith(
        'test',
        'test.mp3',
        undefined
      );
      expect(howlerManager.playSound).toHaveBeenCalledWith('test');
    });

    it('should proxy stop and unload', () => {
      audio.stopSound('test');
      audio.unloadAll();
      expect(howlerManager.stopSound).toHaveBeenCalledWith('test');
      expect(howlerManager.unloadAll).toHaveBeenCalled();
    });
  });
});
