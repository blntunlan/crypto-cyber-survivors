interface BalanceConfig {
  playerBaseHp: number;
  playerDps: number;
  playerDodgeRate: number;
  enemyBaseHp: number;
  enemyBaseDamage: number;
  spawnRateBase: number; // enemies per second
  enemySpeed: number;
}

interface SimulationResult {
  config: BalanceConfig;
  score: number; // Balance score (closer to 100 is better)
  totalTimeMs: number;
  avgHpPercent: number;
  deaths: number;
  kills: number;
  timeInFlowState: number; // Time spent between 30% and 70% HP
}

class BalanceSimulator {
  private tickMs = 100; // 100ms per tick
  private maxDurationMs = 5 * 60 * 1000; // 5 minutes max

  runSimulation(config: BalanceConfig): SimulationResult {
    const tickCount = this.maxDurationMs / this.tickMs;
    let playerHp = config.playerBaseHp;
    let kills = 0;
    let deaths = 0;
    let timeInFlowState = 0;
    let activeEnemies = 0;
    let spawnAccumulator = 0;
    let hpSum = 0;
    let survivalTimeMs = 0;

    let damageAccumulator = 0;

    for (let tick = 0; tick < tickCount; tick++) {
      // Spawn enemies
      // Spawn rate increases slightly over time to simulate difficulty curve
      const timeMultiplier = 1 + tick / tickCount;
      const currentSpawnRate = config.spawnRateBase * timeMultiplier;

      spawnAccumulator += currentSpawnRate * (this.tickMs / 1000);
      while (spawnAccumulator >= 1) {
        activeEnemies++;
        spawnAccumulator--;
      }

      // Simulate player attacking
      if (activeEnemies > 0) {
        damageAccumulator += config.playerDps * (this.tickMs / 1000);
        while (damageAccumulator >= config.enemyBaseHp && activeEnemies > 0) {
          activeEnemies--;
          kills++;
          damageAccumulator -= config.enemyBaseHp;
        }
      }

      // Simulate enemies attacking
      const dodged = Math.random() < config.playerDodgeRate;
      if (!dodged) {
        // Assume a fraction of active enemies can hit the player at any given tick
        const attackingEnemies = Math.ceil(activeEnemies * 0.1);
        const damageTaken =
          attackingEnemies * config.enemyBaseDamage * (this.tickMs / 1000);
        playerHp -= damageTaken;
      }

      const hpPercent = Math.max(0, playerHp / config.playerBaseHp);
      hpSum += hpPercent;

      if (hpPercent >= 0.3 && hpPercent <= 0.7) {
        timeInFlowState += this.tickMs;
      }

      survivalTimeMs += this.tickMs;

      // Check death
      if (playerHp <= 0) {
        deaths++;
        break; // End simulation on death for this basic balance test
      }

      // Auto-heal logic (simulate leveling up or picking up health)
      if (tick % 100 === 0) {
        // Every 10 seconds
        playerHp = Math.min(config.playerBaseHp, playerHp + config.playerBaseHp * 0.1);
      }
    }

    const avgHpPercent = hpSum / (survivalTimeMs / this.tickMs);

    // Calculate a Balance Score
    // Ideal: Survive full 5 mins, Avg HP around 50%, Time in flow is high
    let score = 0;
    if (deaths === 0) score += 40;
    else score += (survivalTimeMs / this.maxDurationMs) * 40;

    // HP balance score (punish being always full HP or always dead)
    const hpDiff = Math.abs(0.5 - avgHpPercent);
    score += (0.5 - hpDiff) * 60; // Max 30 points

    score += (timeInFlowState / this.maxDurationMs) * 30; // Max 30 points

    return {
      config,
      score,
      totalTimeMs: survivalTimeMs,
      avgHpPercent,
      deaths,
      kills,
      timeInFlowState,
    };
  }

  optimize(): void {
    console.log('[BalanceSimulator] Starting optimization permutations...');

    const dpsRange = [10, 15, 20, 25];
    const enemyHpRange = [5, 10, 15];
    const enemyDmgRange = [2, 5, 8];
    const spawnRateRange = [0.5, 1.0, 1.5, 2.0];

    const results: SimulationResult[] = [];

    for (const dps of dpsRange) {
      for (const eHp of enemyHpRange) {
        for (const eDmg of enemyDmgRange) {
          for (const sRate of spawnRateRange) {
            const config: BalanceConfig = {
              playerBaseHp: 100,
              playerDps: dps,
              playerDodgeRate: 0.1,
              enemyBaseHp: eHp,
              enemyBaseDamage: eDmg,
              spawnRateBase: sRate,
              enemySpeed: 1.0,
            };

            // Run multiple times for randomness average
            let totalScore = 0;
            const RUNS = 5;
            let bestResult: SimulationResult | null = null;

            for (let i = 0; i < RUNS; i++) {
              const res = this.runSimulation(config);
              totalScore += res.score;
              if (!bestResult || res.score > bestResult.score) {
                bestResult = res;
              }
            }

            if (bestResult) {
              bestResult.score = totalScore / RUNS; // Average score
              results.push(bestResult);
            }
          }
        }
      }
    }

    results.sort((a, b) => b.score - a.score);

    console.log('==================================================');
    console.log('🎮 TOP 5 OPTIMIZED GAME CONFIGURATIONS');
    console.log('==================================================');

    results.slice(0, 5).forEach((res, i) => {
      console.log(`\nRank #${i + 1} (Score: ${res.score.toFixed(1)}/100)`);
      console.log(
        `Config: DPS=${res.config.playerDps}, EnemyHP=${res.config.enemyBaseHp}, EnemyDmg=${res.config.enemyBaseDamage}, SpawnRate=${res.config.spawnRateBase}/s`
      );
      console.log(
        `Stats: AvgHP=${(res.avgHpPercent * 100).toFixed(1)}%, Survival=${(res.totalTimeMs / 1000).toFixed(1)}s, Kills=${res.kills}, FlowTime=${(res.timeInFlowState / 1000).toFixed(1)}s`
      );
    });
  }
}

const simulator = new BalanceSimulator();
simulator.optimize();
