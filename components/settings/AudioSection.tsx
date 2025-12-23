/**
 * AudioSection - Audio Settings Component
 *
 * Controls for master volume and mute toggle.
 */

import React, { memo } from 'react';
import { audio } from '../../services/audioService';
import { useGameStore, selectAudio } from '../../stores/gameStore';

export const AudioSection = memo(() => {
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
      <h3 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">
        Audio
      </h3>
      <div className="space-y-3 md:space-y-4 bg-white/5 p-3 md:p-4 rounded-xl border border-white/5">
        <div className="flex justify-between items-center">
          <span className="text-xs md:text-sm font-bold text-white uppercase">Master Volume</span>
          <span className="text-[10px] md:text-xs font-tech text-slate-400">
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
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
        />
        <button
          onClick={handleMuteToggle}
          className={`w-full py-2 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all border ${
            audioSettings.isMuted
              ? 'bg-red-500/10 border-red-500/50 text-red-500'
              : 'bg-green-500/10 border-green-500/50 text-green-500'
          }`}
        >
          {audioSettings.isMuted ? '🔇 Sound OFF' : '🔊 Sound ON'}
        </button>
      </div>
    </section>
  );
});

AudioSection.displayName = 'AudioSection';
