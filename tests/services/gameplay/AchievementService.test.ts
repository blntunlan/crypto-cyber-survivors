import { describe, it, expect } from 'vitest';
import { AchievementService } from '../../../services/gameplay/AchievementService';

describe('AchievementService', () => {
  it('can be retrieved', () => {
    expect(AchievementService.getInstance()).toBeInstanceOf(AchievementService);
  });
});
