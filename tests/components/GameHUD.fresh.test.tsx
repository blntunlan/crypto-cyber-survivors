import { describe, it, expect } from 'vitest';
import { GameHUD } from '../../components/GameHUD';

describe('GameHUD freshness', () => {
  it('exports component', () => {
    expect(GameHUD).toBeDefined();
  });
});
