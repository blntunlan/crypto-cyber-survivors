import { describe, it, expect } from 'vitest';
import { MainMenu } from '../../../components/screens/MainMenu';

describe('MainMenu freshness', () => {
  it('exports component', () => {
    expect(MainMenu).toBeDefined();
  });
});
