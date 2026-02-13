import { describe, it, expect } from 'vitest';
import { KernelStatus } from '../../../components/hud/KernelStatus';

describe('KernelStatus freshness', () => {
  it('exports component', () => {
    expect(KernelStatus).toBeDefined();
  });
});
