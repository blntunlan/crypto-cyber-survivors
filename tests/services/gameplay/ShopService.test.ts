import { describe, it, expect } from 'vitest';
import { ShopService } from '../../../services/gameplay/ShopService';

describe('ShopService', () => {
  it('can be retrieved', () => {
    expect(ShopService.getInstance()).toBeInstanceOf(ShopService);
  });
});
