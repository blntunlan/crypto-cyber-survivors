/**
 * ParticleConfigService - Live Tuning for Game Effects
 */

export interface ParticleEffectConfig {
  life: number;
  radiusMultiplier: number;
  spawnChance?: number;
  count?: number;
  speed?: number;
  baseSizeMultiplier?: number;
  critSizeMultiplier?: number;
  superCritSizeMultiplier?: number;
}

class ParticleConfigServiceClass {
  private static instance: ParticleConfigServiceClass | null = null;

  // Default values based on recent tuning
  public trail = {
    life: 0.25,
    radiusMultiplier: 0.61,
    spawnChance: 0.1,
    speedMultiplier: 0.7,
  };

  public impact = {
    count: 5,
    life: 0.4,
    speed: 4,
  };

  public collect = {
    count: 12,
    life: 1.1,
    speed: 3, // Assuming speed from previous or default if not in image
    radius: 1,
  };

  public bullets = {
    baseSizeMultiplier: 1.0,
    critSizeMultiplier: 1.0,
    superCritSizeMultiplier: 0.7,
  };

  private constructor() {}

  static getInstance(): ParticleConfigServiceClass {
    if (!ParticleConfigServiceClass.instance) {
      ParticleConfigServiceClass.instance = new ParticleConfigServiceClass();
    }
    return ParticleConfigServiceClass.instance;
  }

  /**
   * Update a specific config group
   */
  update(
    group: 'trail' | 'impact' | 'collect' | 'bullets',
    params: Partial<ParticleEffectConfig>
  ): void {
    if (this[group]) {
      Object.assign(this[group], params);
      console.log(
        `%c✨ Particle Config Updated: ${group}`,
        'color: #39FF14; font-weight: bold;',
        this[group]
      );
    }
  }

  /**
   * Get current state of all configs
   */
  current() {
    return {
      trail: { ...this.trail },
      impact: { ...this.impact },
      collect: { ...this.collect },
      bullets: { ...this.bullets },
    };
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.trail = { life: 0.25, radiusMultiplier: 0.61, spawnChance: 0.1, speedMultiplier: 0.7 };
    this.impact = { count: 5, life: 0.4, speed: 4 };
    this.collect = { count: 12, life: 1.1, speed: 3, radius: 1 };
    this.bullets = {
      baseSizeMultiplier: 1.0,
      critSizeMultiplier: 1.0,
      superCritSizeMultiplier: 0.7,
    };
    console.log('%c🔄 Particle Config Reset', 'color: #fbbf24; font-weight: bold;');
  }
}

export const ParticleConfigService = ParticleConfigServiceClass.getInstance();
