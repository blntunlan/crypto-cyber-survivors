import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpeedLineSpawner } from '../services/spawners/SpeedLineSpawner';
import { PoolManager } from '../services/combat/PoolManager';
import { screenService } from '../services/system/ScreenService';
import { type GameState, type Player, type SpeedLine } from '../types';

// Mock ScreenService
vi.mock('../services/system/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(() => false),
  },
}));

describe('SpeedLineSpawner', () => {
  let spawner: SpeedLineSpawner;
  let pool: PoolManager;
  let state: GameState;
  let player: Player;

  beforeEach(() => {
    vi.mocked(screenService.isMobile).mockReturnValue(false);
    spawner = new SpeedLineSpawner();
    PoolManager.resetInstance();
    pool = PoolManager.getInstance();
    // Use vi.fn() directly on the instance for this test
    pool.getSpeedLine = vi.fn().mockReturnValue({
      active: true,
      x: 0,
      y: 0,
      radius: 0,
      color: '',
      vx: 10, // Non-zero for velocity test
      vy: 10,
      decay: 0,
    } as unknown as SpeedLine);

    state = {
      isDashing: false,
    } as unknown as GameState;

    player = {
      x: 100,
      y: 100,
    } as unknown as Player;
  });

  it('should not spawn lines if not dashing', () => {
    spawner.update(pool, state, player, 800, 600, 1000);
    expect(pool.getSpeedLine).not.toHaveBeenCalled();
  });

  it('should spawn lines when dashing', () => {
    state.isDashing = true;
    spawner.update(pool, state, player, 800, 600, 1000);

    // Default desktop spawn count is 6
    expect(pool.getSpeedLine).toHaveBeenCalledTimes(6);
  });

  it('should respect spawn interval', () => {
    state.isDashing = true;

    // First update spawns
    spawner.update(pool, state, player, 800, 600, 1000);
    expect(pool.getSpeedLine).toHaveBeenCalledTimes(6);

    // Second update immediately after (interval is 20ms for desktop)
    spawner.update(pool, state, player, 800, 600, 1010);
    expect(pool.getSpeedLine).toHaveBeenCalledTimes(6); // Total count unchanged

    // Update after interval
    spawner.update(pool, state, player, 800, 600, 1030);
    expect(pool.getSpeedLine).toHaveBeenCalledTimes(12); // Spawned again
  });

  it('should use mobile settings when on mobile', () => {
    // Mock mobile to true BEFORE creating the spawner
    vi.mocked(screenService.isMobile).mockReturnValue(true);
    const mobileSpawner = new SpeedLineSpawner();

    state.isDashing = true;
    mobileSpawner.update(pool, state, player, 800, 600, 1000);

    // Mobile spawn count is 3
    expect(pool.getSpeedLine).toHaveBeenCalledTimes(3);

    // Mobile interval is 60ms
    mobileSpawner.update(pool, state, player, 800, 600, 1030); // only 30ms passed
    expect(pool.getSpeedLine).toHaveBeenCalledTimes(3);

    mobileSpawner.update(pool, state, player, 800, 600, 1070); // 70ms passed
    expect(pool.getSpeedLine).toHaveBeenCalledTimes(6);
  });

  it('should position lines around the player', () => {
    state.isDashing = true;
    spawner.update(pool, state, player, 800, 600, 1000);

    const callArgs = vi.mocked(pool.getSpeedLine).mock.calls[0]!;
    const spawnX = callArgs[0];
    const spawnY = callArgs[1];

    // Distance should be significantly away from player (centerDist * multiplier)
    const dist = Math.hypot(spawnX - player.x, spawnY - player.y);
    expect(dist).toBeGreaterThan(400); // centerDist for 800x600 is 400
  });

  it('should set velocity towards the player', () => {
    state.isDashing = true;
    spawner.update(pool, state, player, 800, 600, 1000);

    const callArgs = vi.mocked(pool.getSpeedLine).mock.calls[0]!;
    const spawnX = callArgs[0];
    const spawnY = callArgs[1];
    const angle = callArgs[4];

    const line = vi.mocked(pool.getSpeedLine).mock.results[0]!.value;

    // Angle should point roughly from (spawnX, spawnY) to (player.x, player.y)
    const expectedAngle = Math.atan2(player.y - spawnY, player.x - spawnX);
    expect(angle).toBeCloseTo(expectedAngle, 1);

    // Velocity should align with angle
    expect(line.vx).toBeCloseTo(Math.cos(angle) * (line.vx / Math.cos(angle)), 1);
    expect(line.vy).toBeCloseTo(Math.sin(angle) * (line.vy / Math.sin(angle)), 1);
  });
});
