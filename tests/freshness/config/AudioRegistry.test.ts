import { afterEach, describe, it, expect } from 'vitest';
import { AUDIO_PRESETS, getPreset } from '../../../config/AudioRegistry';
import { ThemeService } from '../../../services/system/ThemeService';

const CORE_RETRO_PAIRS = [
  'shoot',
  'hit',
  'gem',
  'dash',
  'levelUpNote',
  'crit',
  'slotTick',
  'reelStopClick',
  'slotWinNote',
  'coinDing',
  'button',
  'deathNote',
  'nearMiss',
  'selection_tick',
  'keystroke',
  'toggle_switch',
  'achievement_glint',
  'pair_select',
  'whaleArrival',
  'combo',
] as const;

describe('AudioRegistry', () => {
  afterEach(() => {
    ThemeService.setTheme('cyberpunk');
  });

  it('keeps core retro preset pairs in sync', () => {
    for (const id of CORE_RETRO_PAIRS) {
      expect(AUDIO_PRESETS[id]).toBeDefined();
      expect(AUDIO_PRESETS[`retro_${id}`]).toBeDefined();
    }
  });

  it('returns theme-aware preset and falls back when retro variant is missing', () => {
    ThemeService.setTheme('cyberpunk');
    expect(getPreset('shoot')).toBe(AUDIO_PRESETS.shoot);

    ThemeService.setTheme('retro-16bit');
    expect(getPreset('shoot')).toBe(AUDIO_PRESETS.retro_shoot);
    expect(getPreset('heartbeat')).toBe(AUDIO_PRESETS.heartbeat);
  });

  it('ensures all presets have playable component envelopes', () => {
    for (const preset of Object.values(AUDIO_PRESETS)) {
      expect(preset.components.length).toBeGreaterThan(0);
      for (const component of preset.components) {
        expect(component.envelope.duration).toBeGreaterThan(0);
        expect(component.frequency).toBeGreaterThan(0);
      }
    }
  });
});
