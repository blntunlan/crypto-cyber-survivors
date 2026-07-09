import { render, screen, act } from '../../test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LiquidationWarningOverlay } from '../../../components/hud/LiquidationWarningOverlay';
import { useLiquidationWarning } from '../../../hooks/useDifficultyV2';

// Mock hook
vi.mock('../../../hooks/useDifficultyV2', () => ({
  useLiquidationWarning: vi.fn(),
}));

describe('LiquidationWarningOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: do nothing
    (useLiquidationWarning as any).mockImplementation(() => {});
  });

  it('should not render when level is NONE', () => {
    render(<LiquidationWarningOverlay level="NONE" />);
    expect(
      document.querySelector('.liquidation-warning-overlay')
    ).not.toBeInTheDocument();
  });

  it('should render overlay when level is CAUTION', () => {
    render(<LiquidationWarningOverlay level="CAUTION" />);

    // Overlay present
    const overlay = document.querySelector('.liquidation-warning-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveAttribute('data-overlay-priority', 'critical');

    // Text not present
    expect(screen.queryByText(/LIQUIDATION IMMINENT/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/DANGER ZONE/i)).not.toBeInTheDocument();
  });

  it('should render "DANGER ZONE" when level is DANGER', () => {
    render(<LiquidationWarningOverlay level="DANGER" />);

    expect(screen.getByText('⚠ DANGER ZONE ⚠')).toBeInTheDocument();
    expect(screen.getByText(/% from liquidation/i)).toBeInTheDocument();
  });

  it('should render "LIQUIDATION IMMINENT" when level is CRITICAL', () => {
    render(<LiquidationWarningOverlay level="CRITICAL" />);

    expect(screen.getByText('⚠ LIQUIDATION IMMINENT ⚠')).toBeInTheDocument();
  });

  it('should render FOV tunnel when fovReduction > 0', () => {
    render(<LiquidationWarningOverlay level="CRITICAL" fovReduction={0.5} />);

    const tunnel = document.querySelector('.fov-tunnel');
    expect(tunnel).toBeInTheDocument();
  });

  it('should not render FOV tunnel when fovReduction is 0', () => {
    render(<LiquidationWarningOverlay level="CRITICAL" fovReduction={0} />);

    const tunnel = document.querySelector('.fov-tunnel');
    expect(tunnel).not.toBeInTheDocument();
  });

  it('should update state from useLiquidationWarning hook when no external level provided', () => {
    let hookCallback: (level: string, distance: number) => void;
    (useLiquidationWarning as any).mockImplementation((cb: any) => {
      hookCallback = cb;
    });

    render(<LiquidationWarningOverlay />); // No level prop

    // Initially NONE -> nothing
    expect(
      document.querySelector('.liquidation-warning-overlay')
    ).not.toBeInTheDocument();

    // Trigger update via hook callback
    act(() => {
      hookCallback('DANGER', 15.5);
    });

    expect(screen.getByText('⚠ DANGER ZONE ⚠')).toBeInTheDocument();
    expect(screen.getByText('15.5% from liquidation')).toBeInTheDocument();
  });

  it('should prefer external level prop over hook state', () => {
    let hookCallback: (level: string, distance: number) => void;
    (useLiquidationWarning as any).mockImplementation((cb: any) => {
      hookCallback = cb;
    });

    render(<LiquidationWarningOverlay level="CRITICAL" />);

    // Trigger update via hook with lower priority
    act(() => {
      hookCallback('NONE', 100);
    });

    // Should still show CRITICAL
    expect(screen.getByText('⚠ LIQUIDATION IMMINENT ⚠')).toBeInTheDocument();
  });
});
