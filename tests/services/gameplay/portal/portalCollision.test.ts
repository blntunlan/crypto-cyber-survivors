import { describe, it, expect } from 'vitest';
import { checkPortalCollision } from '../../../../services/gameplay/portal/portalCollision';

describe('checkPortalCollision', () => {
  const PLAYER_RADIUS = 16;
  const PORTAL_RADIUS = 40;

  it('returns collides=true when player overlaps portal center', () => {
    const result = checkPortalCollision(
      100,
      100,
      PLAYER_RADIUS,
      100,
      100,
      PORTAL_RADIUS
    );
    expect(result.collides).toBe(true);
    expect(result.distance).toBe(0);
  });

  it('threshold is playerRadius + portalRadius * 0.4', () => {
    const result = checkPortalCollision(0, 0, PLAYER_RADIUS, 0, 0, PORTAL_RADIUS);
    expect(result.threshold).toBe(32); // 16 + 40*0.4
  });

  it('collides when distance is just under threshold', () => {
    // threshold = 32, dist = 31
    const result = checkPortalCollision(
      131,
      100,
      PLAYER_RADIUS,
      100,
      100,
      PORTAL_RADIUS
    );
    expect(result.collides).toBe(true);
  });

  it('does NOT collide when distance equals threshold', () => {
    // threshold = 32, dist = 32
    const result = checkPortalCollision(
      132,
      100,
      PLAYER_RADIUS,
      100,
      100,
      PORTAL_RADIUS
    );
    expect(result.collides).toBe(false);
  });

  it('does NOT collide when far apart', () => {
    const result = checkPortalCollision(0, 0, PLAYER_RADIUS, 500, 500, PORTAL_RADIUS);
    expect(result.collides).toBe(false);
  });

  it('computes euclidean distance correctly (3-4-5 triangle)', () => {
    const result = checkPortalCollision(0, 0, PLAYER_RADIUS, 3, 4, PORTAL_RADIUS);
    expect(result.distance).toBe(5);
  });

  it('handles zero portal radius', () => {
    const result = checkPortalCollision(5, 0, PLAYER_RADIUS, 0, 0, 0);
    expect(result.threshold).toBe(PLAYER_RADIUS);
    expect(result.collides).toBe(true); // dist=5 < 16
  });

  it('handles large portal radius', () => {
    const result = checkPortalCollision(0, 0, PLAYER_RADIUS, 0, 0, 200);
    expect(result.threshold).toBe(96); // 16 + 200*0.4
  });

  it('handles negative coordinates', () => {
    const result = checkPortalCollision(
      -10,
      -10,
      PLAYER_RADIUS,
      -10,
      -10,
      PORTAL_RADIUS
    );
    expect(result.collides).toBe(true);
    expect(result.distance).toBe(0);
  });
});
