import { type AudioPreviewEntry } from '../../../types/previewLab';
import { AUDIO_PRESETS } from '../../../config/AudioRegistry';

const RETRO_PREFIX = 'retro_';

function hasRetroVariant(id: string): boolean {
  return `${RETRO_PREFIX}${id}` in AUDIO_PRESETS;
}

const PRESET_IDS: ReadonlyArray<string> = [
  'shoot',
  'crit',
  'hit',
  'gem',
  'dash',
  'combo',
  'comboNote',
  'sineNote',
  'triangleNote',
  'levelUpNote',
  'deathNote',
  'nearMiss',
  'heartbeat',
  'whaleArrival',
  'button',
  'selection_tick',
  'keystroke',
  'toggle_switch',
  'achievement_glint',
  'pair_select',
  'slotTick',
  'reelStopClick',
  'slotWinNote',
  'coinDing',
  'slotAnticipationTremolo',
  'slotNearMissNote',
  'slotMultiplierBell',
  'slotSlowdownTension',
  'slotSparkle',
];

function labelize(id: string): string {
  return id
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function categoryOf(presetId: string): string {
  if (['shoot', 'crit', 'hit', 'deathNote', 'combo', 'comboNote'].includes(presetId)) {
    return 'combat';
  }
  if (
    ['gem', 'levelUpNote', 'achievement_glint', 'pair_select', 'coinDing'].includes(
      presetId
    )
  ) {
    return 'feedback';
  }
  if (['dash', 'nearMiss', 'heartbeat'].includes(presetId)) return 'movement';
  if (['button', 'selection_tick', 'keystroke', 'toggle_switch'].includes(presetId)) {
    return 'ui';
  }
  if (['whaleArrival', 'slotNearMissNote'].includes(presetId)) return 'alerts';
  if (['sineNote', 'triangleNote'].includes(presetId)) return 'notes';
  if (presetId.startsWith('slot')) return 'slots';
  return 'other';
}

function buildPresetEntries(): AudioPreviewEntry[] {
  const entries: AudioPreviewEntry[] = [];
  for (const id of PRESET_IDS) {
    if (!(id in AUDIO_PRESETS)) continue;
    entries.push({
      id: `audio-preset-${id}`,
      label: labelize(id),
      category: categoryOf(id),
      kind: 'preset',
      presetId: id,
      hasRetroVariant: hasRetroVariant(id),
    });
  }
  return entries;
}

const COMPOSITE_DEFS: ReadonlyArray<{
  compositeId: AudioPreviewEntry['compositeId'];
  label: string;
  category: string;
  description?: string;
}> = [
  {
    compositeId: 'playLevelUp',
    label: 'Level Up (arpeggio)',
    category: 'feedback',
    description: '4-note ascending arpeggio (levelUpNote x4).',
  },
  {
    compositeId: 'playDeath',
    label: 'Death (descent)',
    category: 'combat',
    description: '3-note descending death sequence.',
  },
  {
    compositeId: 'playCombo',
    label: 'Combo (multiplier)',
    category: 'combat',
    description: 'Combo sound with multiplier harmonics.',
  },
  {
    compositeId: 'playComboMilestone1',
    label: 'Combo Milestone 1',
    category: 'combat',
    description: 'Escalating combo milestone #1.',
  },
  {
    compositeId: 'playComboMilestone5',
    label: 'Combo Milestone 5',
    category: 'combat',
    description: 'Escalating combo milestone #5 (peak).',
  },
  {
    compositeId: 'playWeaponFire',
    label: 'Weapon Fire (quantum)',
    category: 'combat',
    description: 'Weapon-aware fire feedback for quantum_bullet.',
  },
  {
    compositeId: 'playSlotWin',
    label: 'Slot Win (fanfare)',
    category: 'slots',
    description: 'Slot machine win fanfare.',
  },
  {
    compositeId: 'playJackpot',
    label: 'Jackpot (mega win)',
    category: 'slots',
    description: 'Extended jackpot celebration.',
  },
  {
    compositeId: 'playCoinShower',
    label: 'Coin Shower',
    category: 'slots',
    description: 'Coin rain effect.',
  },
  {
    compositeId: 'playAnticipation',
    label: 'Anticipation (rising)',
    category: 'slots',
    description: 'Anticipation rising tone.',
  },
  {
    compositeId: 'playMultiplierChime',
    label: 'Multiplier Chime',
    category: 'slots',
    description: 'Multiplier increase effect.',
  },
  {
    compositeId: 'playSlowdownTension',
    label: 'Slowdown Tension',
    category: 'slots',
    description: 'Suspenseful rumble as reel slows.',
  },
  {
    compositeId: 'playSpinStart',
    label: 'Spin Start (whoosh)',
    category: 'slots',
    description: 'Subtle spin-start whoosh.',
  },
];

function buildCompositeEntries(): AudioPreviewEntry[] {
  return COMPOSITE_DEFS.map(d => ({
    id: `audio-composite-${d.compositeId}`,
    label: d.label,
    category: d.category,
    description: d.description,
    kind: 'composite' as const,
    compositeId: d.compositeId,
    hasRetroVariant: true,
  }));
}

export const AUDIO_CATALOG: ReadonlyArray<AudioPreviewEntry> = [
  ...buildPresetEntries(),
  ...buildCompositeEntries(),
];

export const AUDIO_CATEGORIES: ReadonlyArray<
  'all' | 'combat' | 'feedback' | 'movement' | 'ui' | 'alerts' | 'slots' | 'notes'
> = ['all', 'combat', 'feedback', 'movement', 'ui', 'alerts', 'slots', 'notes'];
