import { type RuntimeDifficultySnapshot } from '../../types/runtimeDifficulty';
import {
  ShadowComparisonRecorder,
  type CurrentDirectorSnapshot,
  type ShadowComparisonRecord,
} from '../difficulty/runtime/ShadowComparisonRecorder';

/**
 * Compatibility wrapper retained for tooling that imports the former shadow
 * runtime. It performs comparison recording only and owns no difficulty logic.
 */
export class ShadowDirectorRuntime {
  public constructor(
    private readonly recorder: ShadowComparisonRecorder = new ShadowComparisonRecorder()
  ) {}

  public record(
    scenarioId: string,
    current: CurrentDirectorSnapshot,
    modular: RuntimeDifficultySnapshot
  ): ShadowComparisonRecord {
    return this.recorder.record(scenarioId, current, modular);
  }

  public getRecords(): readonly ShadowComparisonRecord[] {
    return this.recorder.getRecords();
  }

  public reset(): void {
    this.recorder.reset();
  }
}
