import { describe, expect, it } from 'vitest';
import { createRandomStopOrder } from '../../components/screens/LevelUpScreen/constants';

describe('createRandomStopOrder', () => {
  it('includes every choice exactly once for four-choice level ups', () => {
    const order = createRandomStopOrder(4, () => 0.5);

    expect([...order].sort((left, right) => left - right)).toEqual([0, 1, 2, 3]);
  });

  it('uses the provided random source to shuffle the stop sequence', () => {
    const values = [0, 0];
    let index = 0;

    expect(createRandomStopOrder(3, () => values[index++] ?? 0)).toEqual([1, 2, 0]);
  });
});
