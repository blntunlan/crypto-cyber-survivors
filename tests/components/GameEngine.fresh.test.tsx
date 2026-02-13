import { describe, it, expect } from 'vitest';
import GameEngineShared, { GameEngine } from '../../components/GameEngine';

describe('GameEngine freshness', () => {
  it('exports main and shared components', () => {
    expect(GameEngine).toBeDefined();
    expect(GameEngineShared).toBeDefined();
  });
});
