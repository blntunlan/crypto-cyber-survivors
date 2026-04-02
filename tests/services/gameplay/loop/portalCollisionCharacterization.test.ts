/**
 * Characterization tests: Portal Collision Logic
 *
 * Documents the current portal collision check as implemented in GameEngine.tsx.
 * The formula (line 863-864):
 *   pDist = Math.hypot(player.x - portal.x, player.y - portal.y)
 *   collision = pDist < player.radius + portal.radius * 0.4
 *
 * The 0.4 multiplier on portal radius makes the collision zone smaller than visual radius.
 * These tests lock in this behavior before extracting to a utility function.
 */
import { describe, it, expect } from 'vitest';

/** Replicate the portal collision check from GameEngine.tsx */
function checkPortalCollision(
  playerX: number,
  playerY: number,
  playerRadius: number,
  portalX: number,
  portalY: number,
  portalRadius: number
): { collides: boolean; distance: number; threshold: number } {
  const distance = Math.hypot(playerX - portalX, playerY - portalY);
  const threshold = playerRadius + portalRadius * 0.4;
  return {
    collides: distance < threshold,
    distance,
    threshold,
  };
}

describe('Portal Collision Characterization', () => {
  const PLAYER_RADIUS = 16;
  const PORTAL_RADIUS = 40;

  it('collision threshold uses 0.4x portal radius, not full radius', () => {
    const { threshold } = checkPortalCollision(
      0,
      0,
      PLAYER_RADIUS,
      100,
      100,
      PORTAL_RADIUS
    );
    // 16 + 40*0.4 = 16 + 16 = 32
    expect(threshold).toBe(32);
  });

  it('collides when player overlaps portal center', () => {
    const { collides } = checkPortalCollision(
      100,
      100,
      PLAYER_RADIUS,
      100,
      100,
      PORTAL_RADIUS
    );
    expect(collides).toBe(true);
  });

  it('collides when distance is just under threshold', () => {
    // threshold = 32, place player 31 pixels right of portal
    const { collides } = checkPortalCollision(
      131,
      100,
      PLAYER_RADIUS,
      100,
      100,
      PORTAL_RADIUS
    );
    expect(collides).toBe(true);
  });

  it('does NOT collide when distance equals threshold exactly', () => {
    // threshold = 32, place player exactly 32 pixels right
    const { collides } = checkPortalCollision(
      132,
      100,
      PLAYER_RADIUS,
      100,
      100,
      PORTAL_RADIUS
    );
    expect(collides).toBe(false);
  });

  it('does NOT collide when player is far away', () => {
    const { collides } = checkPortalCollision(
      0,
      0,
      PLAYER_RADIUS,
      400,
      400,
      PORTAL_RADIUS
    );
    expect(collides).toBe(false);
  });

  it('diagonal distance is computed correctly via Math.hypot', () => {
    // Player at (0,0), portal at (3,4) → distance = 5
    const { distance } = checkPortalCollision(0, 0, PLAYER_RADIUS, 3, 4, PORTAL_RADIUS);
    expect(distance).toBe(5);
  });

  it('large portal radius gives proportionally larger collision zone', () => {
    const bigPortalRadius = 100;
    const { threshold } = checkPortalCollision(
      0,
      0,
      PLAYER_RADIUS,
      0,
      0,
      bigPortalRadius
    );
    // 16 + 100*0.4 = 56
    expect(threshold).toBe(56);
  });

  it('zero portal radius means only player radius matters', () => {
    const { threshold } = checkPortalCollision(0, 0, PLAYER_RADIUS, 0, 0, 0);
    expect(threshold).toBe(PLAYER_RADIUS);
  });
});
