import { type StateCreator } from 'zustand';
import { type SoundCategory, type CategoryVolumes } from '../../services/audio/types';
import { DEFAULT_CATEGORY_VOLUMES } from '../../services/audio/constants';

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  isMuted: boolean;
  categoryVolumes: CategoryVolumes;
}

export const DEFAULT_AUDIO: AudioSettings = {
  masterVolume: 1.0,
  sfxVolume: 0.8,
  musicVolume: 0.5,
  isMuted: false,
  categoryVolumes: { ...DEFAULT_CATEGORY_VOLUMES },
};

export interface AudioActions {
  setMasterVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  toggleMute: () => void;
  setCategoryVolume: (category: SoundCategory, volume: number) => void;
}

export interface AudioSlice extends AudioActions {
  audio: AudioSettings;
}

export const createAudioSlice: StateCreator<AudioSlice> = (set) => ({
  audio: DEFAULT_AUDIO,

  setMasterVolume: (volume) =>
    set((state) => ({
      audio: { ...state.audio, masterVolume: Math.max(0, Math.min(1, volume)) },
    })),

  setSfxVolume: (volume) =>
    set((state) => ({
      audio: { ...state.audio, sfxVolume: Math.max(0, Math.min(1, volume)) },
    })),

  setMusicVolume: (volume) =>
    set((state) => ({
      audio: { ...state.audio, musicVolume: Math.max(0, Math.min(1, volume)) },
    })),

  toggleMute: () =>
    set((state) => ({
      audio: { ...state.audio, isMuted: !state.audio.isMuted },
    })),

  setCategoryVolume: (category, volume) =>
    set((state) => ({
      audio: {
        ...state.audio,
        categoryVolumes: {
          ...state.audio.categoryVolumes,
          [category]: Math.max(0, Math.min(1, volume)),
        },
      },
    })),
});
