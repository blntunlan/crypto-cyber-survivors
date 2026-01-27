import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AccountHealthPremium } from '../../../components/hud/AccountHealthPremium';
import { screenService } from '../../../services/ScreenService';
import { DifficultyManager } from '../../../services/DifficultyManager';
import { EventBus } from '../../../services/EventBus';

// Mocks
vi.mock('../../../services/ScreenService', () => ({
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

vi.mock('../../../services/DifficultyManager', () => ({
  DifficultyManager: {
    getWavePhase: vi.fn(),
  },
}));

vi.mock('../../../services/EventBus', () => ({
  EventBus: {
    on: vi.fn(),
  },
}));

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
    (DifficultyManager.getWavePhase as any).mockReturnValue('warmup');
    (EventBus.on as any).mockReturnValue(vi.fn());
  });

  const defaultProps = {
    hpPercent: 100,
    hp: 100,
    maxHp: 100,
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

    // Desktop elements hidden
    expect(screen.queryByText('hud.system_phase')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Terminal_ID: CC-S_08.21 // Core_Integrity_Module')
    ).not.toBeInTheDocument();
  });

  describe('Health States', () => {
    it('should show "Secure" state (> 75%)', () => {
      render(<AccountHealthPremium {...defaultProps} hpPercent={80} />);
      expect(screen.getByText('hud.equity_secure')).toHaveClass('text-cyan-400');
    });

    it('should show "Caution" state (> 50% && <= 75%)', () => {
      render(<AccountHealthPremium {...defaultProps} hpPercent={60} />);
      expect(screen.getByText('hud.margin_caution')).toHaveClass('text-yellow-400');
    });

    it('should show "Pressure" state (> 25% && <= 50%)', () => {
      render(<AccountHealthPremium {...defaultProps} hpPercent={40} />);
      expect(screen.getByText('hud.margin_pressure')).toHaveClass('text-orange-500');
    });

    it('should show "Liquidation Risk" state (<= 25%)', () => {
      render(<AccountHealthPremium {...defaultProps} hpPercent={10} />);
      expect(screen.getByText('hud.liquidation_risk')).toHaveClass('text-red-600');
    });
  });

  it('should update wave phase via EventBus', () => {
    let phaseChangeCallback: (data: { phase: string }) => void;
    (EventBus.on as any).mockImplementation((event: string, cb: any) => {
      if (event === 'wavePhaseChange') phaseChangeCallback = cb;
      return vi.fn();
    });

    render(<AccountHealthPremium {...defaultProps} />);

    // Initial
    expect(screen.getByText('hud.phases.warmup')).toBeInTheDocument();

    // Trigger update
    act(() => {
      phaseChangeCallback({ phase: 'climax' });
    });

    expect(screen.getByText('hud.phases.climax')).toBeInTheDocument();
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

    // Should now be minimal
    expect(screen.queryByText('hud.system_phase')).not.toBeInTheDocument();
  });

  describe('Wave Phase Colors', () => {
    it('should apply correct color for warmup', () => {
      (DifficultyManager.getWavePhase as any).mockReturnValue('warmup');
      render(<AccountHealthPremium {...defaultProps} />);
      expect(screen.getByText('hud.phases.warmup')).toHaveClass('text-cyan-400');
    });

    it('should apply correct color for climax', () => {
      (DifficultyManager.getWavePhase as any).mockReturnValue('climax');
      render(<AccountHealthPremium {...defaultProps} />);
      expect(screen.getByText('hud.phases.climax')).toHaveClass('text-red-500');
    });

    it('should apply default color for unknown phase', () => {
      (DifficultyManager.getWavePhase as any).mockReturnValue('unknown_phase');
      render(<AccountHealthPremium {...defaultProps} />);
      expect(screen.getByText('hud.phases.unknown_phase')).toHaveClass(
        'text-slate-400'
      );
    });
  });

  it('should apply critical pulse animation when HP is low', () => {
    render(<AccountHealthPremium {...defaultProps} hpPercent={10} />);
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
