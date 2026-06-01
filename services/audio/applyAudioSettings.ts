import { DEFAULT_CATEGORY_VOLUMES } from './constants';
import { audio } from './AudioService';
import { type CategoryVolumes, type SoundCategory } from './types';

type RuntimeAudioSettings = {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  isMuted: boolean;
  categoryVolumes: CategoryVolumes;
};

const AUDIO_CATEGORIES = Object.keys(DEFAULT_CATEGORY_VOLUMES) as SoundCategory[];

function deriveCategoryVolume(
  settings: Pick<RuntimeAudioSettings, 'sfxVolume' | 'musicVolume' | 'categoryVolumes'>,
  category: SoundCategory
): number {
  const categoryVolume = settings.categoryVolumes[category];
  if (category === 'music') {
    return categoryVolume * settings.musicVolume;
  }
  return categoryVolume * settings.sfxVolume;
}

export function applyAudioSettings(settings: RuntimeAudioSettings): void {
  audio.setVolume(settings.masterVolume);

  if (audio.getMuted() !== settings.isMuted) {
    audio.setMuted(settings.isMuted);
  }

  AUDIO_CATEGORIES.forEach(category => {
    audio.setCategoryVolume(category, deriveCategoryVolume(settings, category));
  });
}

export function deriveAppliedCategoryVolumes(
  settings: Pick<RuntimeAudioSettings, 'sfxVolume' | 'musicVolume' | 'categoryVolumes'>
): CategoryVolumes {
  const volumes = { ...DEFAULT_CATEGORY_VOLUMES };
  AUDIO_CATEGORIES.forEach(category => {
    volumes[category] = deriveCategoryVolume(settings, category);
  });
  return volumes;
}
