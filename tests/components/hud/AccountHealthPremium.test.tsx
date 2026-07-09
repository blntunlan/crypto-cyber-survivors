import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountHealthPremium } from '../../../components/hud/AccountHealthPremium';
import { screenService } from '../../../services/system/ScreenService';

vi.mock('../../../services/system/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(),
    onChange: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../../../hooks/useResponsiveUI', () => ({
  useResponsiveUI: () => ({
    rs: (value: number) => value,
    bottomSafeZone: 0,
  }),
}));

vi.mock('../../../contexts/useTheme', () => ({
  useIsRetro: vi.fn(() => false),
}));

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

describe('AccountHealthPremium', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(screenService.isMobile).mockReturnValue(false);
  });

  it('renders one compact HP value and no legacy terminal chrome', () => {
    render(<AccountHealthPremium hp={72} maxHp={100} hpPercent={72} />);

    const rail = screen.getByTestId('war-room-hp-rail');
    expect(rail).toHaveTextContent('HP');
    expect(rail).toHaveTextContent('72 / 100');
    expect(rail).toHaveAttribute('data-hud-tone', 'gold');
    expect(rail).not.toHaveClass('bg-black');
    expect(screen.queryByText('hud.system_phase')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Terminal_ID: CC-S_08.21 // Core_Integrity_Module')
    ).not.toBeInTheDocument();
  });

  it('changes the compact rail to the danger tone at 35 percent', () => {
    render(<AccountHealthPremium hp={35} maxHp={100} hpPercent={35} />);

    expect(screen.getByTestId('war-room-hp-rail')).toHaveAttribute(
      'data-hud-tone',
      'danger'
    );
  });

  it('keeps the compact rail after a mobile screen change', () => {
    let resizeCallback: () => void = () => undefined;
    vi.mocked(screenService.onChange).mockImplementation(callback => {
      resizeCallback = callback;
      return vi.fn();
    });

    render(<AccountHealthPremium hp={72} maxHp={100} hpPercent={72} />);

    vi.mocked(screenService.isMobile).mockReturnValue(true);
    act(() => {
      resizeCallback();
    });

    expect(screen.getByTestId('war-room-hp-rail')).toBeInTheDocument();
  });
});
