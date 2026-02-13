import { describe, it, expect } from 'vitest';
import CycleDecisionScreen, {
  CycleDecisionScreen as CycleDecisionScreenNamed,
} from '../../../components/hud/CycleDecisionScreen';

describe('CycleDecisionScreen freshness', () => {
  it('exports default and named component', () => {
    expect(CycleDecisionScreenNamed).toBeDefined();
    expect(CycleDecisionScreen).toBeDefined();
  });
});
