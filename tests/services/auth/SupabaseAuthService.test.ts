import { describe, it, expect } from 'vitest';
import { SupabaseAuthService } from '../../../services/auth/SupabaseAuthService';

describe('SupabaseAuthService', () => {
  it('exports singleton service', () => {
    expect(SupabaseAuthService).toBeDefined();
  });
});
