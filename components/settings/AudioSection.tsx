/**
 * AudioSection - Audio Settings Component
 *
 * Controls for master volume and mute toggle.
 */

import React, { memo } from 'react';
import { audio } from '../../services/audio';
import { useGameStore } from '../../stores/gameStore';

import { IconVolume, IconVolumeMuted } from '../icons/CardIcons';
import { useLanguage } from '../../contexts/LanguageContext';

interface AudioSectionProps {
  focusedItem?: 'volume' | 'mute' | null;
}

export const AudioSection = memo(({ focusedItem }: AudioSectionProps) => {
  const setMasterVolume = useGameStore(state => state.setMasterVolume);
  const toggleMute = useGameStore(state => state.toggleMute);
  const { t } = useLanguage();
  const audioSettings = useGameStore(state => state.audio);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setMasterVolume(newVolume);
    audio.setVolume(newVolume);
  };

  const handleMuteToggle = () => {
    toggleMute();
    audio.toggleMute();
  };

  return (
    <section className="space-y-3 md:space-y-4">
      <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 md:text-xs">
        <IconVolume className="h-3.5 w-3.5" color="#64748b" />
        <span>{t('settings.audio')}</span>
      </h3>

      <div className="space-y-3 rounded-sm border border-white/5 bg-white/5 p-3 md:space-y-4 md:p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-bold uppercase text-white md:text-sm">
            {t('settings.master_volume')}
          </span>

          <span className="font-tech text-[10px] tabular-nums text-slate-400 md:text-xs">
            {Math.round(audioSettings.masterVolume * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={audioSettings.masterVolume}
          onChange={handleVolumeChange}
          className={`h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-yellow-500 transition-all ${
            focusedItem === 'volume'
              ? 'shadow-[0_0_10px_rgba(255,255,255,0.3)] ring-2 ring-white'
              : ''
          }`}
        />
        <button
          onClick={handleMuteToggle}
          className={`flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
            audioSettings.isMuted
              ? 'border-red-500/50 bg-red-500/10 text-red-500'
              : 'border-green-500/50 bg-green-500/10 text-green-500'
          } ${focusedItem === 'mute' ? 'scale-[1.02] shadow-[0_0_10px_rgba(255,255,255,0.3)] ring-2 ring-white' : ''}`}
        >
          {audioSettings.isMuted ? (
            <>
              <IconVolumeMuted className="h-4 w-4" />
              <span>{t('settings.muted')}</span>
            </>
          ) : (
            <>
              <IconVolume className="h-4 w-4" />
              <span>{t('settings.unmuted')}</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
});

AudioSection.displayName = 'AudioSection';
