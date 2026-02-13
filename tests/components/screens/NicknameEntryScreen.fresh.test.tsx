import { describe, it, expect } from 'vitest';
import { NicknameEntryScreen } from '../../../components/screens/NicknameEntryScreen';

describe('NicknameEntryScreen freshness', () => {
  it('exports component', () => {
    expect(NicknameEntryScreen).toBeDefined();
  });
});
