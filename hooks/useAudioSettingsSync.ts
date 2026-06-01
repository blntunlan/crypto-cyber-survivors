import { useEffect } from 'react';
import { applyAudioSettings } from '../services/audio/applyAudioSettings';
import { selectAudio, useGameStore } from '../stores/gameStore';

export function useAudioSettingsSync(): void {
  const audioSettings = useGameStore(selectAudio);

  useEffect(() => {
    applyAudioSettings(audioSettings);
  }, [audioSettings]);
}
