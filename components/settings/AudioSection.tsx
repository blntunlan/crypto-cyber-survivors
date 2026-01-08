/**
 * AudioSection - Audio Settings Component
 *
 * Controls for master volume and mute toggle.
 */

import React, { memo } from 'react';
import { audio } from '../../services/AudioService';
import { useGameStore, selectAudio } from '../../stores/gameStore';

import { IconVolume, IconVolumeMuted } from '../icons/CardIcons';

interface AudioSectionProps {
  focusedItem?: 'volume' | 'mute' | null;
}

export const AudioSection = memo(({ focusedItem }: AudioSectionProps) => {
  const audioSettings = useGameStore(selectAudio);
  const setMasterVolume = useGameStore(state => state.setMasterVolume);
  const toggleMute = useGameStore(state => state.toggleMute);

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
      <h3 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
        <IconVolume className="w-3.5 h-3.5" color="#64748b" />
        <span>Audio</span>
      </h3>
      <div className="space-y-3 md:space-y-4 bg-white/5 p-3 md:p-4 rounded-xl border border-white/5">
        <div className="flex justify-between items-center">
          <span className="text-xs md:text-sm font-bold text-white uppercase flex items-center gap-2">
            Master Volume
          </span>
          <span className="text-[10px] md:text-xs font-tech text-slate-400 tabular-nums">
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
          className={`w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500 transition-all ${
            focusedItem === 'volume'
              ? 'ring-2 ring-white shadow-[0_0_10px_rgba(255,255,255,0.3)]'
              : ''
          }`}
        />
        <button
          onClick={handleMuteToggle}
          className={`w-full py-2 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all border flex items-center justify-center gap-2 ${
            audioSettings.isMuted
              ? 'bg-red-500/10 border-red-500/50 text-red-500'
              : 'bg-green-500/10 border-green-500/50 text-green-500'
          } ${focusedItem === 'mute' ? 'ring-2 ring-white shadow-[0_0_10px_rgba(255,255,255,0.3)] scale-[1.02]' : ''}`}
        >
          {audioSettings.isMuted ? (
            <>
              <IconVolumeMuted className="w-4 h-4" />
              <span>Sound OFF</span>
            </>
          ) : (
            <>
              <IconVolume className="w-4 h-4" />
              <span>Sound ON</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
});

AudioSection.displayName = 'AudioSection';
