import {
  type PresentationCue,
  type PresentationSnapshot,
} from './PresentationDirector';

export type EventBusPresentationTargets = {
  notify: (payload: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning';
  }) => void;
  overlay: (payload: {
    effect: 'red_flash' | 'green_pulse' | 'blue_calm' | 'purple_chaos';
    intensity: number;
    durationMs: number;
  }) => void;
  playAccent: (cue: PresentationCue) => void;
  setAmbience: (ambience: PresentationSnapshot['ambience']) => void;
};

const CUE_LABELS: Record<PresentationCue['type'], string> = {
  ENCOUNTER_TELEGRAPH: 'Market event incoming',
  ENCOUNTER_ACTIVE: 'Market encounter active',
  MARKET_STALE: 'Market feed delayed',
  MARKET_RECONNECTED: 'Market feed restored',
  SAFE_EXIT_AVAILABLE: 'Safe exit available',
};

const getOverlayEffect = (
  cue: PresentationCue
): EventBusPresentationTargets['overlay'] extends (payload: infer T) => void
  ? T extends { effect: infer TEffect }
    ? TEffect
    : never
  : never => {
  switch (cue.type) {
    case 'ENCOUNTER_TELEGRAPH':
      return 'purple_chaos';
    case 'ENCOUNTER_ACTIVE':
      return 'red_flash';
    case 'MARKET_STALE':
      return 'blue_calm';
    case 'MARKET_RECONNECTED':
      return 'green_pulse';
    case 'SAFE_EXIT_AVAILABLE':
      return 'green_pulse';
  }
};

/** Concrete HUD/audio/VFX adapter with no access to gameplay systems. */
export class EventBusPresentationCueAdapter {
  private readonly targets: EventBusPresentationTargets;

  public constructor(targets: EventBusPresentationTargets) {
    this.targets = targets;
  }

  public apply(snapshot: PresentationSnapshot): void {
    if (!snapshot.isEnabled) return;

    this.targets.setAmbience(snapshot.ambience);
    let playedAudioAccent = false;
    if (snapshot.sensory.flash > 0) {
      this.targets.overlay({
        effect: 'red_flash',
        intensity: snapshot.sensory.flash,
        durationMs: 250,
      });
    }

    for (const cue of snapshot.cues) {
      this.targets.notify({
        title: 'MARKET SIGNAL',
        message: CUE_LABELS[cue.type],
        type:
          cue.type === 'MARKET_STALE' || cue.type === 'ENCOUNTER_ACTIVE'
            ? 'warning'
            : cue.type === 'MARKET_RECONNECTED' || cue.type === 'SAFE_EXIT_AVAILABLE'
              ? 'success'
              : 'info',
      });
      this.targets.overlay({
        effect: getOverlayEffect(cue),
        intensity: cue.intensity,
        durationMs: 500,
      });
      if (!playedAudioAccent && snapshot.sensory.audioAccent > 0) {
        this.targets.playAccent(cue);
        playedAudioAccent = true;
      }
    }
  }
}
