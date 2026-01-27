import { DifficultyManager } from '../services/gameplay/DifficultyManager';
import { TimeService } from '../services/core/TimeService';

/**
 * Difficulty Simulator - Matematiksel Model Analiz Aracı
 * Bu araç ile farklı borsa ve oyun senaryolarını simüle edip
 * zorluk katsayılarını (Spawn Rate, Speed vb.) gözlemleyebiliriz.
 */

interface Scenario {
  name: string;
  timeMins: number;
  pnl: number;
  leverage: number;
  atr: number;
  level: number;
  hp: number;
}

const scenarios: Scenario[] = [
  {
    name: 'Yeni Başlangıç',
    timeMins: 0,
    pnl: 0,
    leverage: 10,
    atr: 0.01,
    level: 1,
    hp: 100,
  },
  {
    name: '5. Dakika - Stabil',
    timeMins: 5,
    pnl: 0.05,
    leverage: 10,
    atr: 0.01,
    level: 10,
    hp: 100,
  },
  {
    name: '5. Dakika - Zararda (Kaldıraçlı)',
    timeMins: 5,
    pnl: -0.5,
    leverage: 50,
    atr: 0.02,
    level: 10,
    hp: 40,
  },
  {
    name: '10. Dakika - Balina Etkisi / Kaos',
    timeMins: 10,
    pnl: -0.9,
    leverage: 100,
    atr: 0.05,
    level: 20,
    hp: 20,
  },
  {
    name: 'Late Game - Kazanan Oyuncu',
    timeMins: 15,
    pnl: 2.0,
    leverage: 10,
    atr: 0.01,
    level: 30,
    hp: 100,
  },
];

export function runDifficultySimulation() {
  console.log('\n=== DIFFICULTY MATHEMATICAL ANALYSIS ===\n');
  console.log(
    String('Scenario').padEnd(30),
    String('Total').padEnd(8),
    String('Spawn').padEnd(8),
    String('Speed').padEnd(8),
    String('HP').padEnd(8)
  );
  console.log('-'.repeat(70));

  scenarios.forEach(s => {
    // Simüle edilen zamanı ayarla
    TimeService.reset();
    // @ts-expect-error:  Private method access for simulation
    TimeService.lastTime = 0;
    // @ts-expect-error: testing
    TimeService.gameTimeSeconds = s.timeMins * 60;

    DifficultyManager.startGame(s.leverage);

    const output = DifficultyManager.calculate(s.pnl, s.atr, s.level, s.hp / 100);

    console.log(
      s.name.padEnd(30),
      output.total.toFixed(2).padEnd(8),
      output.spawnRate.toFixed(2).padEnd(8),
      output.enemySpeed.toFixed(2).padEnd(8),
      output.enemyHealth.toFixed(2).padEnd(8)
    );
  });
  console.log('\n=========================================\n');
}
