import { describe, it, expect } from 'vitest';
import { PhantomAuthService } from '../../../services/auth/PhantomAuthService';

describe('PhantomAuthService', () => {
  it('exports singleton service', () => {
    expect(PhantomAuthService).toBeDefined();
  });
});
