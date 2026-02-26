/**
 * SoundMixerSection - Individual Sound Category Volume Controls
 *
 * Allows users to adjust volume for each sound category:
 * - Combat (shoot, crit, hit)
 * - Feedback (gem, levelUp, combo)
 * - Movement (dash, whoosh)
 * - UI (buttons)
 * - Alerts (heartbeat, death)
 * - Slots (slot machine sounds)
 */

import { memo, useEffect } from 'react';
import { audio } from '../../services/audio';
import { useGameStore } from '../../stores/gameStore';
import { useIsRetro } from '../../contexts/useTheme';
import { COLORS } from '../../constants';
import { type SoundCategory } from '../../services/audio/types';
import {
  IconMarketChart,
  IconDiamond,
  IconBolt,
  IconFlashPulse,
  IconSkull,
  IconGenesisEmblem,
  IconSettings,
} from '../icons/CardIcons';
import { useLanguage } from '../../contexts/LanguageContext';

interface CategoryConfig {
  label: string;
  Icon: React.FC<{ className?: string; color?: string }>;
  description: string;
}

const CATEGORY_CONFIG: Record<SoundCategory, CategoryConfig> = {
  combat: { label: 'Combat', Icon: IconMarketChart, description: 'Shoot, crit, hit' },
  feedback: {
    label: 'Feedback',
    Icon: IconDiamond,
    description: 'Gems, level up, combos',
  },
  movement: { label: 'Movement', Icon: IconBolt, description: 'Dash, whoosh' },
  ui: { label: 'UI', Icon: IconFlashPulse, description: 'Buttons, menus' },
  alerts: { label: 'Alerts', Icon: IconSkull, description: 'Low HP, death' },
  slots: {
    label: 'Slots',
    Icon: IconGenesisEmblem,
    description: 'Level up slot machine',
  },
  music: {
    label: 'Music',
    Icon: IconFlashPulse,
    description: 'Market beats and ambient tones',
  },
  sfx: { label: 'SFX', Icon: IconBolt, description: 'General sound effects' },
};

const CATEGORIES: SoundCategory[] = [
  'combat',
  'feedback',
  'movement',
  'ui',
  'alerts',
  'slots',
  'music',
  'sfx',
];

interface SoundMixerSectionProps {
  focusedCategory?: SoundCategory | null;
}

export const SoundMixerSection = memo(({ focusedCategory }: SoundMixerSectionProps) => {
  const categoryVolumes = useGameStore(state => state.audio.categoryVolumes);
  const setCategoryVolume = useGameStore(state => state.setCategoryVolume);
  const isRetro = useIsRetro();
  const { t } = useLanguage();

  // Sync category volumes to AudioService
  useEffect(() => {
    CATEGORIES.forEach(category => {
      const volume = categoryVolumes[category];
      audio.setCategoryVolume(category, volume);
    });
  }, [categoryVolumes]);

  const handleVolumeChange = (category: SoundCategory, value: number) => {
    setCategoryVolume(category, value);
    audio.setCategoryVolume(category, value);
  };

  return (
    <section className="space-y-3 md:space-y-4">
      <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 md:text-xs">
        <IconSettings className="h-3.5 w-3.5" color="#64748b" />
        <span>{t('settings.mixer')}</span>
      </h3>

      <div
        className={`space-y-2 p-3 md:p-4 ${
          isRetro
            ? 'rounded-none border-2 border-zinc-600 bg-zinc-800'
            : 'rounded-sm border border-white/5 bg-white/5'
        }`}
      >
        {CATEGORIES.map(category => {
          const config = CATEGORY_CONFIG[category];
          const volume = categoryVolumes[category];
          const isFocused = focusedCategory === category;

          return (
            <div
              key={category}
              className={`py-2 transition-all ${
                isFocused ? '-mx-2 rounded-lg bg-white/5 px-2 ring-2 ring-white' : ''
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`flex items-center gap-1.5 text-[10px] font-bold uppercase md:text-xs ${
                    isRetro ? 'text-white' : 'text-slate-300'
                  }`}
                >
                  <config.Icon
                    className="h-3 w-3 md:h-3.5 md:w-3.5"
                    color={isRetro ? COLORS.JACKPOT_YELLOW : 'currentColor'}
                  />
                  <span>{t(`settings.cat_${category}`)}</span>
                </span>

                <span
                  className={`font-tech text-[9px] tabular-nums md:text-[10px] ${
                    isRetro ? 'text-zinc-400' : 'text-slate-500'
                  }`}
                >
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={e => handleVolumeChange(category, parseFloat(e.target.value))}
                className={`h-1 w-full cursor-pointer appearance-none rounded-lg transition-all ${
                  isRetro
                    ? 'bg-zinc-700 accent-[var(--color-primary)]'
                    : 'bg-slate-700 accent-cyan-500'
                } ${isFocused ? 'shadow-[0_0_10px_rgba(255,255,255,0.3)] ring-2 ring-white' : ''}`}
                style={{
                  accentColor: isRetro ? COLORS.JACKPOT_YELLOW : undefined,
                }}
              />
              <p
                className={`mt-0.5 text-[8px] ${isRetro ? 'text-zinc-500' : 'text-slate-600'}`}
              >
                {t(`settings.desc_${category}`)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
});

SoundMixerSection.displayName = 'SoundMixerSection';
