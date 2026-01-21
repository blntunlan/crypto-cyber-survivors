import { describe, it } from 'vitest';
import { DifficultyManager } from '../services/DifficultyManager';
import { TimeService } from '../services/TimeService';

/**
 * 5-Minute Cycle Yoyo Analysis
 * Bu test, 5 dakikalık bir run boyunca zorluğun nasıl dalgalandığını analiz eder.
 */
describe('5-Minute Cycle Yoyo Analysis', () => {
  it('should simulate a 5-minute run with PnL fluctuations', () => {
    console.log('\n=== 5-MINUTE RUN SIMULATION (YOYO ANALYSIS) ===\n');
    console.log(
      String('Time').padEnd(10),
      String('Phase').padEnd(15),
      String('PnL').padEnd(8),
      String('Total Diff').padEnd(12),
      String('WaveMult').padEnd(10),
      String('PnLFactor').padEnd(10)
    );
    console.log('-'.repeat(75));

    const leverage = 20;
    DifficultyManager.startGame(leverage);

    // 5 dakika = 300 saniye, 15 saniyelik adımlarla gidelim
    for (let sec = 0; sec <= 300; sec += 15) {
      TimeService.setGameTime(sec * 1000);

      // PnL dalgalanması simüle edelim (Yoyo piyasası)
      // İlk 2 dakika kâr, sonra sert düşüş, sonra toparlanma
      let pnl = 0;
      if (sec < 120)
        pnl = (sec / 120) * 0.2; // %20 kâr
      else if (sec < 200)
        pnl = 0.2 - ((sec - 120) / 80) * 0.5; // %30 zarara düşüş
      else pnl = -0.3 + ((sec - 200) / 100) * 0.1; // Hafif toparlanma

      const output = DifficultyManager.calculate(pnl, 0.02, 5, 0.8);

      console.log(
        `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`.padEnd(10),
        DifficultyManager.getWavePhase().padEnd(15),
        (pnl * 100).toFixed(0).concat('%').padEnd(8),
        output.total.toFixed(2).padEnd(12),
        output.factors.waveMultiplier.toFixed(2).padEnd(10),
        output.factors.pnlEffect.toFixed(2).padEnd(10)
      );
    }

    // Cycle 2 (Zorluk Artışı Kontrolü)
    console.log('\n--- CYCLE 2 START (60% INCREASE) ---');
    TimeService.reset();
    // @ts-expect-error: testing
    TimeService.gameTimeSeconds = 301;
    const c2Output = DifficultyManager.calculate(0, 0.02, 5, 1.0);
    console.log(
      `Cycle 2 Start Total Difficulty: ${c2Output.total.toFixed(2)} (vs Cycle 1 start)`
    );
  });
});
