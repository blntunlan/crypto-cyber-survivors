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
import { audio } from '../../services/AudioService';
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
};

const CATEGORIES: SoundCategory[] = [
  'combat',
  'feedback',
  'movement',
  'ui',
  'alerts',
  'slots',
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
      <h3 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
        <IconSettings className="w-3.5 h-3.5" color="#64748b" />
        <span>{t('settings.mixer')}</span>
      </h3>

      <div
        className={`space-y-2 p-3 md:p-4 ${
          isRetro
            ? 'bg-zinc-800 border-2 border-zinc-600 rounded-none'
            : 'bg-white/5 rounded-xl border border-white/5'
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
                isFocused ? 'ring-2 ring-white rounded-lg px-2 -mx-2 bg-white/5' : ''
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span
                  className={`text-[10px] md:text-xs font-bold uppercase flex items-center gap-1.5 ${
                    isRetro ? 'text-white' : 'text-slate-300'
                  }`}
                >
                  <config.Icon
                    className="w-3 h-3 md:w-3.5 md:h-3.5"
                    color={isRetro ? COLORS.JACKPOT_YELLOW : 'currentColor'}
                  />
                  <span>{t(`settings.cat_${category}`)}</span>
                </span>

                <span
                  className={`text-[9px] md:text-[10px] font-tech tabular-nums ${
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
                className={`w-full h-1 rounded-lg appearance-none cursor-pointer transition-all ${
                  isRetro
                    ? 'bg-zinc-700 accent-[var(--color-primary)]'
                    : 'bg-slate-700 accent-cyan-500'
                } ${isFocused ? 'ring-2 ring-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' : ''}`}
                style={{
                  accentColor: isRetro ? COLORS.JACKPOT_YELLOW : undefined,
                }}
              />
              <p
                className={`text-[8px] mt-0.5 ${isRetro ? 'text-zinc-500' : 'text-slate-600'}`}
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
