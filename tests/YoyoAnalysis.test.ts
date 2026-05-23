import { beforeEach, describe, expect, it } from 'vitest';
import { DifficultyManager } from '../services/gameplay/DifficultyManager';
import { TimeService } from '../services/core/TimeService';

/**
 * 5-Minute Cycle Yoyo Analysis
 * Bu test, 5 dakikalık bir run boyunca zorluğun nasıl dalgalandığını analiz eder.
 *
 * NOTE: AI Director V2 - Wave phase system removed
 * Phase will always show 'active' now. Difficulty driven by market conditions.
 */
describe('5-Minute Cycle Yoyo Analysis (AI Director V2)', () => {
  beforeEach(() => {
    DifficultyManager.reset();
    TimeService.reset();
  });

  it('should keep difficulty bounded during a 5-minute yoyo run', () => {
    const leverage = 20;
    DifficultyManager.startGame(leverage);
    const rows: {
      sec: number;
      pnl: number;
      total: number;
      spawnRate: number;
      enemyHP: number;
    }[] = [];

    // 5 dakika = 300 saniye, 15 saniyelik adımlarla gidelim
    for (let sec = 0; sec <= 300; sec += 15) {
      TimeService.setGameTime(sec * 1000);

      // PnL dalgalanması simüle edelim (Yoyo piyasası)
      // İlk 2 dakika kâr, sonra sert düşüş, sonra toparlanma
      let pnl = 0;
      if (sec < 120) {
        pnl = (sec / 120) * 0.2; // %20 kâr
      } else if (sec < 200) {
        pnl = 0.2 - ((sec - 120) / 80) * 0.5; // %30 zarara düşüş
      } else {
        pnl = -0.3 + ((sec - 200) / 100) * 0.1; // Hafif toparlanma
      }

      const output = DifficultyManager.calculate(pnl, 0.02, 5, 0.8);
      rows.push({
        sec,
        pnl,
        total: output.total,
        spawnRate: output.spawnRate,
        enemyHP: output.enemyHP,
      });
    }

    expect(rows).toHaveLength(21);
    expect(rows[0]?.sec).toBe(0);
    expect(rows.at(-1)?.sec).toBe(300);
    expect(Math.min(...rows.map(row => row.pnl))).toBeLessThan(0);

    for (const row of rows) {
      expect(Number.isFinite(row.total)).toBe(true);
      expect(Number.isFinite(row.spawnRate)).toBe(true);
      expect(Number.isFinite(row.enemyHP)).toBe(true);
      expect(row.total).toBeGreaterThanOrEqual(0.2);
      expect(row.total).toBeLessThanOrEqual(10);
      expect(row.spawnRate).toBeGreaterThan(0);
      expect(row.enemyHP).toBeGreaterThan(0);
    }
  });

  it('should enter the second cycle after five minutes', () => {
    // Cycle 2 (Zorluk Artışı Kontrolü)
    TimeService.reset();
    TimeService.setGameTime(301_000);

    const output = DifficultyManager.calculate(0, 0.02, 5, 1.0);
    const state = DifficultyManager.getDebugState();

    expect(output.wavePhase).toBe('active');
    expect(output.total).toBeGreaterThan(0);
    expect(output.total).toBeLessThanOrEqual(10);
    expect(state.cycleNumber).toBe(2);
    expect(state.cycleProgress).toBeGreaterThan(0);
  });
});
