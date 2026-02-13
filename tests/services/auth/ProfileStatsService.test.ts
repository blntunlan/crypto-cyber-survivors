import { describe, it, expect } from 'vitest';
import { ProfileStatsService } from '../../../services/auth/ProfileStatsService';

describe('ProfileStatsService', () => {
  it('can be instantiated', () => {
    expect(new ProfileStatsService()).toBeInstanceOf(ProfileStatsService);
  });
});
