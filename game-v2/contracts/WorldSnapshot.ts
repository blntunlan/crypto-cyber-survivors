export const WORLD_SNAPSHOT_SCHEMA_VERSION = 7 as const;

export type WorldSnapshot = Readonly<{
  schemaVersion: typeof WORLD_SNAPSHOT_SCHEMA_VERSION;
  capacity: number;
  activeCount: number;
  freeSlotCount: number;
  freeSlots: Uint16Array;
  generations: Uint32Array;
  masks: Uint32Array;
  x: Float32Array;
  y: Float32Array;
  previousX: Float32Array;
  previousY: Float32Array;
  velocityX: Float32Array;
  velocityY: Float32Array;
  radius: Float32Array;
  health: Float32Array;
  maxHealth: Float32Array;
  faction: Int8Array;
  lastFacingX: Float32Array;
  lastFacingY: Float32Array;
  dashDirectionX: Float32Array;
  dashDirectionY: Float32Array;
  dashRemainingSeconds: Float32Array;
  invulnerabilityTicksRemaining: Uint16Array;
  dashCooldownTicksRemaining: Uint16Array;
  dashCharges: Uint8Array;
  movementOverride: Uint8Array;
  enemySpeed: Float32Array;
  contactDamage: Float32Array;
  contactCooldownTicksRemaining: Uint16Array;
  xpValue: Float32Array;
  projectileDamage: Float32Array;
  projectileLifetimeTicksRemaining: Uint16Array;
  xp: Float32Array;
  level: Uint16Array;
  xpPickupValue: Float32Array;
  /** Market-independent Convergence: XP-equivalent points and the latched reached flag (`V2-109`). */
  convergence: Float32Array;
  convergenceReached: Uint8Array;
  /** `ABILITY_SLOT_COUNT` entries per world slot (V2-ADR-036). */
  abilitySlotIdentity: Uint8Array;
  abilitySlotTier: Uint8Array;
  /** Per ability slot, not per world slot: each `auto` weapon owns its own cadence (`V2-111`, V2-ADR-076). */
  weaponCooldownTicksRemaining: Uint16Array;
  /** `PASSIVE_SLOT_COUNT` entries per world slot (V2-ADR-040). */
  passiveSlotIdentity: Uint8Array;
  passiveSlotLevel: Uint8Array;
  /** `OFFER_CANDIDATE_COUNT` entries per world slot (V2-ADR-049). */
  offerCandidateKind: Uint8Array;
  offerCandidateCode: Uint8Array;
  offerDefaultIndex: Uint8Array;
  /** Per-run reroll/banish charges and the single banished identity (V2-105). */
  rerollCharges: Uint8Array;
  banishCharges: Uint8Array;
  bannedCandidateKind: Uint8Array;
  bannedCandidateCode: Uint8Array;
}>;
