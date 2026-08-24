import { MVP1_ENEMY_REGISTRY } from '@/game-v2/config/EnemyRegistry';
import { type EnemyDefinition } from '@/game-v2/contracts/EnemyArchetype';
import { type SpawnEncounterOutput } from '@/game-v2/contracts/EncounterOutput';
import { TREND_BREAKOUT_THEME_IDS } from '@/game-v2/market/TrendBreakoutEncounter';
import { type DeterministicRng } from '@/game-v2/runtime/DeterministicRng';
import { EnemyComposer } from '@/game-v2/systems/EnemyComposer';

/**
 * Turns a composed `SpawnEncounterOutput` into an enemy composition
 * (`V2-208`). Its only input is the already-composed output — never
 * `MarketSnapshot` or a raw indicator value — which is what proves "market
 * intent selects composition without raw indicator reads in enemies"
 * structurally, not just by convention.
 *
 * Both known theme ids resolve to the same injected `EnemyComposer`
 * (`MVP1_ENEMY_REGISTRY` by default) — no themeId-differentiated registry
 * exists yet (V2-ADR-130); `enemyBudget` is spent by delegating to that
 * composer unmodified, not reimplemented.
 */
export class SpawnEncounterConsumer {
  private readonly composer: EnemyComposer;
  private readonly knownThemeIds: ReadonlySet<string>;

  public constructor(
    composer: EnemyComposer = new EnemyComposer(MVP1_ENEMY_REGISTRY),
    knownThemeIds: ReadonlySet<string> = new Set(TREND_BREAKOUT_THEME_IDS)
  ) {
    this.composer = composer;
    this.knownThemeIds = knownThemeIds;
  }

  public compose(
    output: SpawnEncounterOutput,
    rng: Pick<DeterministicRng, 'nextInt'>,
    out: EnemyDefinition[]
  ): void {
    if (!this.knownThemeIds.has(output.themeId)) {
      throw new RangeError(
        `spawn encounter consumer received an unrecognized themeId: ${output.themeId}`
      );
    }

    this.composer.compose(output.enemyBudget, rng, out);
  }
}
