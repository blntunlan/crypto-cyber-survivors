import type { PoolManager } from '../PoolManager';
import type { Player, GameState } from '../../types';
import { screenService } from '../ScreenService';

export class SpeedLineSpawner {
  private lastSpawnTime = 0;
  private isMobile = false;

  constructor() {
    this.isMobile = screenService.isMobile();
  }

  public update(
    pool: PoolManager,
    state: GameState,
    player: Player,
    width: number,
    height: number,
    currentTime: number
  ): void {
    // Only spawn lines when dashing or highly active
    if (!state.isDashing) return;

    // Device-specific settings
    const spawnInterval = this.isMobile ? 60 : 20; // Faster spawn rate everywhere
    const spawnCount = this.isMobile ? 3 : 6; // Significantly more lines

    // Spawn rate limiter
    if (currentTime - this.lastSpawnTime < spawnInterval) return;

    this.lastSpawnTime = currentTime;
    this.spawnDashLines(pool, player, width, height, spawnCount);
  }

  private spawnDashLines(
    pool: PoolManager,
    player: Player,
    width: number,
    height: number,
    count: number
  ): void {
    const centerDist = Math.max(width, height) / 2;

    for (let i = 0; i < count; i++) {
      // Random position on the screen edge or circle
      const angle = Math.random() * Math.PI * 2;

      // Spawn closer on mobile to ensure visibility before decay kicks in
      const distMultiplier = this.isMobile
        ? 0.9 + Math.random() * 0.2
        : 1.2 + Math.random() * 0.5;
      const spawnDist = centerDist * distMultiplier;
      const startX = player.x + Math.cos(angle) * spawnDist;
      const startY = player.y + Math.sin(angle) * spawnDist;

      // Calculate direction towards player (Anime style focus lines)
      const targetAngle = Math.atan2(player.y - startY, player.x - startX);

      // Add slight randomness to angle
      const finalAngle = targetAngle + (Math.random() - 0.5) * 0.1;

      // High speed
      const speed = 40 + Math.random() * 20;

      // Reduced size and opacity for mobile
      const lengthBase = this.isMobile ? 150 : 200;
      const widthBase = this.isMobile ? 1.5 : 2;
      const opacityBase = this.isMobile ? 0.3 : 0.5;

      const line = pool.getSpeedLine(
        startX,
        startY,
        100 + Math.random() * lengthBase,
        widthBase + Math.random() * 2,
        finalAngle,
        opacityBase + Math.random() * 0.3
      );

      // Set velocity towards center
      line.vx = Math.cos(finalAngle) * speed;
      line.vy = Math.sin(finalAngle) * speed;

      // Decay faster on mobile to keep center screen clear
      line.decay = this.isMobile ? 0.05 : 0.04;
    }
  }
}
