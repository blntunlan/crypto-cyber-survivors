import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AccountHealthPremium } from '../../../components/hud/AccountHealthPremium';
import { screenService } from '../../../services/system/ScreenService';

// Mocks
vi.mock('../../../services/system/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(),
    onChange: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../../../hooks/useResponsiveUI', () => ({
  useResponsiveUI: () => ({
    rs: (val: number) => val,
    rfs: (val: number) => val,
    isSmallDevice: false,
    bottomSafeZone: 0,
  }),
}));

// NOTE: DifficultyManager.getWavePhase mock removed in AI Director V2
// Wave phase system removed - difficulty now market-driven

vi.mock('../../../contexts/useTheme', () => ({
  useIsRetro: vi.fn(),
}));

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

describe('AccountHealthPremium', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (screenService.isMobile as any).mockReturnValue(false);
  });

  const defaultProps = {
    hp: 100,
    maxHp: 100,
    hpPercent: 100,
  };

  it('should render correctly in Desktop mode', () => {
    render(<AccountHealthPremium {...defaultProps} />);

    // Desktop elements
    expect(screen.getByText('hud.system_phase')).toBeInTheDocument();
    expect(screen.getByText('hud.equity_secure')).toBeInTheDocument(); // > 75%
    expect(
      screen.getByText('Terminal_ID: CC-S_08.21 // Core_Integrity_Module')
    ).toBeInTheDocument();
  });

  it('should render correctly in Mobile mode', () => {
    (screenService.isMobile as any).mockReturnValue(true);
    render(<AccountHealthPremium {...defaultProps} />);

    // Mobile elements present
    expect(screen.getAllByText('100').length).toBeGreaterThanOrEqual(1); // HP text

    // System phase label now shown on mobile (smaller font)
    expect(screen.getByText('hud.system_phase')).toBeInTheDocument();

    // Desktop-only cosmetic decals still hidden on mobile
    expect(
      screen.queryByText('Terminal_ID: CC-S_08.21 // Core_Integrity_Module')
    ).not.toBeInTheDocument();
  });

  describe('Health States', () => {
    it('should show "Secure" state (> 75%)', () => {
      render(<AccountHealthPremium hp={80} maxHp={100} hpPercent={80} />);
      expect(screen.getByText('hud.equity_secure')).toHaveClass('text-cyan-400');
    });

    it('should show "Caution" state (> 50% && <= 75%)', () => {
      render(<AccountHealthPremium hp={60} maxHp={100} hpPercent={60} />);
      expect(screen.getByText('hud.margin_caution')).toHaveClass('text-yellow-400');
    });

    it('should show "Pressure" state (> 25% && <= 50%)', () => {
      render(<AccountHealthPremium hp={40} maxHp={100} hpPercent={40} />);
      expect(screen.getByText('hud.margin_pressure')).toHaveClass('text-orange-500');
    });

    it('should show "Liquidation Risk" state (<= 25%)', () => {
      render(<AccountHealthPremium hp={10} maxHp={100} hpPercent={10} />);
      expect(screen.getByText('hud.liquidation_risk')).toHaveClass('text-red-600');
    });
  });

  // NOTE: Wave phase tests removed in AI Director V2
  // Wave phase system removed - difficulty now market-driven
  // The UI now always shows "active" phase with cyan color

  it('should display static "active" phase (AI Director V2)', () => {
    render(<AccountHealthPremium {...defaultProps} />);

    // Should show "active" phase with cyan color
    expect(screen.getByText('hud.phases.active')).toBeInTheDocument();
    expect(screen.getByText('hud.phases.active')).toHaveClass('text-cyan-400');
  });

  it('should handle screen resize events', () => {
    let resizeCallback: () => void;
    (screenService.onChange as any).mockImplementation((cb: any) => {
      resizeCallback = cb;
      return vi.fn();
    });

    const { rerender } = render(<AccountHealthPremium {...defaultProps} />);

    // Start desktop
    expect(screen.getByText('hud.system_phase')).toBeInTheDocument();

    // Switch to mobile
    (screenService.isMobile as any).mockReturnValue(true);
    act(() => {
      resizeCallback();
    });

    rerender(<AccountHealthPremium {...defaultProps} />);

    // System phase label still visible on mobile (smaller font)
    expect(screen.getByText('hud.system_phase')).toBeInTheDocument();
    // Desktop-only tech decals hidden on mobile
    expect(
      screen.queryByText('Terminal_ID: CC-S_08.21 // Core_Integrity_Module')
    ).not.toBeInTheDocument();
  });

  // NOTE: Wave Phase Colors tests removed in AI Director V2
  // Wave phase system removed - now always shows "active" phase with cyan color

  it('should apply critical pulse animation when HP is low', () => {
    render(<AccountHealthPremium hp={10} maxHp={100} hpPercent={10} />);
    // Can't easily test animation class presence on specific dynamic elements without more specific selectors,
    // but we can check if the status text wrapper has animate-pulse
    const statusText = screen.getByText('hud.liquidation_risk');
    expect(statusText).toHaveClass('animate-pulse');
  });

  it('should render retro styles when useIsRetro returns true', async () => {
    const useTheme = await import('../../../contexts/useTheme');
    (useTheme.useIsRetro as any).mockReturnValue(true);

    render(<AccountHealthPremium {...defaultProps} />);

    // Retro mode removes drop-shadow
    const hpText = screen.getByText('100');
    // The parent of '100' should have 'text-shadow-retro'
    expect(hpText.closest('div')).toHaveClass('text-shadow-retro');
  });
});
