/**
 * Shared AoE hit-check geometry (`V2-300`'s `bloater` burst, reused by
 * `V2-301`'s `volatile` elite on-death burst) — a distance-squared check
 * against a combined radius, extracted so both callers share exactly one
 * implementation of "did this burst hit the player" rather than
 * duplicating the formula.
 */
export const isWithinBurstRadius = (
  centerX: number,
  centerY: number,
  burstRadius: number,
  targetX: number,
  targetY: number,
  targetRadius: number
): boolean => {
  const diffX = targetX - centerX;
  const diffY = targetY - centerY;
  const distSq = diffX * diffX + diffY * diffY;
  const combinedRadius = burstRadius + targetRadius;

  return distSq <= combinedRadius * combinedRadius;
};
