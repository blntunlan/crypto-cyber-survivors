import { describe, expect, it } from 'vitest';
import { SEASON_CONFIG } from '../../../config/SeasonConfig';
import { SeasonService } from '../../../services/product/SeasonService';

describe('SeasonService', () => {
  it('returns the active Solana alpha season', () => {
    expect(SeasonService.getActiveSeason()).toEqual(SEASON_CONFIG);
    expect(SeasonService.getActiveSeason().ecosystem).toBe('solana');
  });

  it('calculates capped season points from verified gameplay inputs', () => {
    const result = SeasonService.calculatePoints({
      survivalSeconds: 300,
      kills: 100,
      level: 8,
      questCompletions: 2,
      walletConnected: true,
    });

    expect(result).toEqual({
      seasonId: SEASON_CONFIG.id,
      survivalPoints: 600,
      killPoints: 500,
      levelPoints: 700,
      questPoints: 1000,
      walletIdentityBonus: 250,
      totalPoints: 3050,
    });
  });

  it('clamps invalid inputs and caps oversized runs', () => {
    const result = SeasonService.calculatePoints({
      survivalSeconds: 100_000,
      kills: -5,
      level: 0,
      questCompletions: -1,
      walletConnected: false,
    });

    expect(result.killPoints).toBe(0);
    expect(result.levelPoints).toBe(0);
    expect(result.questPoints).toBe(0);
    expect(result.totalPoints).toBe(SEASON_CONFIG.scoring.maxRunPoints);
  });
});
