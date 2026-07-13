import { type DifficultyOutputV2 } from '../difficulty/types';
import { type DirectorInputFrame, type GameplaySnapshot } from './contracts';
import {
  DirectorTelemetryRecorder,
  LegacyDifficultyAdapter,
  type DirectorTelemetryRecord,
} from './DirectorTelemetry';
import { ExperienceDirector } from './ExperienceDirector';
import { type DirectorRuntimePlan } from './DirectorRuntimeMode';

export type ShadowDirectorUpdate = {
  snapshot: GameplaySnapshot;
  telemetry: DirectorTelemetryRecord | null;
};

/**
 * Runtime boundary for the migration period. In SHADOW mode it calculates and
 * records Director output only. Spawn, combat, reward, UI, and audio remain
 * untouched until an authority-mode executor explicitly consumes snapshots.
 */
export class ShadowDirectorRuntime {
  private readonly director: ExperienceDirector;
  private readonly telemetry: DirectorTelemetryRecorder;

  public constructor(
    director: ExperienceDirector = new ExperienceDirector(),
    telemetry: DirectorTelemetryRecorder = new DirectorTelemetryRecorder()
  ) {
    this.director = director;
    this.telemetry = telemetry;
  }

  public update(
    plan: DirectorRuntimePlan,
    frame: DirectorInputFrame,
    legacyOutput: DifficultyOutputV2 | null
  ): ShadowDirectorUpdate | null {
    if (!plan.runsShadowDirector) return null;

    const snapshot = this.director.update(frame);
    const telemetry =
      snapshot.validFromTick === frame.tick
        ? this.telemetry.record(
            snapshot,
            this.director.getLastTrace(),
            legacyOutput === null
              ? null
              : LegacyDifficultyAdapter.fromOutput(legacyOutput)
          )
        : null;

    return { snapshot, telemetry };
  }

  public getRecords(): readonly DirectorTelemetryRecord[] {
    return this.telemetry.getRecords();
  }

  public reset(): void {
    this.director.reset();
    this.telemetry.reset();
  }
}
