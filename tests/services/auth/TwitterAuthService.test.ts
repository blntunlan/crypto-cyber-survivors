import { describe, it, expect } from 'vitest';
import { TwitterAuthService } from '../../../services/auth/TwitterAuthService';

describe('TwitterAuthService', () => {
  it('exports singleton service', () => {
    expect(TwitterAuthService).toBeDefined();
  });
});
