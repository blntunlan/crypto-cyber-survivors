/**
 * VFX Lab — Plugin-based preview system for visual effects.
 *
 * Each visual effect (weapon, skill, particle, hud flourish) registers a
 * VfxPreviewModule. The lab renders each module in its own canvas and tracks
 * a status (draft/review/approved/in-game/rejected) in localStorage.
 *
 * Dev-only. Not bundled in production.
 */

export type VfxStatus = 'draft' | 'review' | 'approved' | 'in-game' | 'rejected';

export type VfxCategory = 'weapon' | 'skill' | 'impact' | 'particle' | 'hud' | 'other';

export interface VfxPreviewSimContext {
  width: number;
  height: number;
  /** Total ms since preview started (affected by pause) */
  elapsedMs: number;
  /** Center-anchor player position */
  playerX: number;
  playerY: number;
  /** Mock enemies orbiting around the center — useful for targeting effects */
  enemies: ReadonlyArray<{ x: number; y: number; radius: number; id: number }>;
}

export interface VfxPreviewModule<TState = unknown> {
  id: string;
  category: VfxCategory;
  label: string;
  description?: string;
  /** Author / feature owner — optional, for tracking */
  author?: string;
  /**
   * If true, the preview canvas will skip drawing its default mock enemies —
   * the module takes full responsibility for the scene.
   */
  manageOwnScene?: boolean;
  /** Called once when preview starts/resets. Return mutable state. */
  init(sim: VfxPreviewSimContext): TState;
  /** Per-frame update. Mutate state in place. */
  tick(state: TState, sim: VfxPreviewSimContext, dtMs: number): void;
  /** Per-frame render. */
  render(ctx: CanvasRenderingContext2D, state: TState, sim: VfxPreviewSimContext): void;
}

export interface VfxStatusRecord {
  status: VfxStatus;
  notes?: string;
  updatedAt: number;
}
