import {
  type PresentationCue,
  type PresentationSnapshot,
} from './PresentationDirector';

export type PresentationCueTargets = {
  applyAmbience: (ambience: PresentationSnapshot['ambience']) => void;
  emitCue: (cue: PresentationCue) => void;
  applySensory: (sensory: PresentationSnapshot['sensory']) => void;
};

/**
 * Thin boundary for HUD, audio, and VFX adapters. It deliberately receives no
 * gameplay control surface, so an accessibility or visual preference cannot
 * change combat, spawn, rewards, or the Director snapshot.
 */
export class PresentationCueAdapter {
  private readonly targets: PresentationCueTargets;

  public constructor(targets: PresentationCueTargets) {
    this.targets = targets;
  }

  public apply(snapshot: PresentationSnapshot): void {
    if (!snapshot.isEnabled) return;

    this.targets.applyAmbience(snapshot.ambience);
    this.targets.applySensory(snapshot.sensory);
    for (const cue of snapshot.cues) this.targets.emitCue(cue);
  }
}
