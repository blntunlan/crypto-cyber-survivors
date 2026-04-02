export interface PortalCollisionResult {
  /** Whether the player has entered the portal's collision zone */
  collides: boolean;
  /** Euclidean distance between player and portal centers */
  distance: number;
  /** Collision threshold: playerRadius + portalRadius * 0.4 */
  threshold: number;
}

/**
 * Pure function that checks if a player overlaps a portal's collision zone.
 * Extracted from GameEngine.tsx portal collision check.
 *
 * The 0.4 multiplier on portal radius makes the effective collision zone
 * smaller than the visual portal, requiring the player to be close to center.
 */
export function checkPortalCollision(
  playerX: number,
  playerY: number,
  playerRadius: number,
  portalX: number,
  portalY: number,
  portalRadius: number
): PortalCollisionResult {
  const distance = Math.hypot(playerX - portalX, playerY - portalY);
  const threshold = playerRadius + portalRadius * 0.4;
  return {
    collides: distance < threshold,
    distance,
    threshold,
  };
}
