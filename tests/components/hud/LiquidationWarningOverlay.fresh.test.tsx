import { describe, it, expect } from 'vitest';
import LiquidationWarningOverlay, {
  LiquidationWarningOverlay as LiquidationWarningOverlayNamed,
} from '../../../components/hud/LiquidationWarningOverlay';

describe('LiquidationWarningOverlay freshness', () => {
  it('exports default and named component', () => {
    expect(LiquidationWarningOverlayNamed).toBeDefined();
    expect(LiquidationWarningOverlay).toBeDefined();
  });
});
