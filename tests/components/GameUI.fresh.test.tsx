import { describe, it, expect } from 'vitest';
import { GameUI } from '../../components/GameUI';

describe('GameUI freshness', () => {
  it('exports component', () => {
    expect(GameUI).toBeDefined();
  });
});
