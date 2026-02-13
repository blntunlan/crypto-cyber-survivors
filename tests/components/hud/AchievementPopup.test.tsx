import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { AchievementPopup } from '../../../components/hud/AchievementPopup';
import { screenService } from '../../../services/system/ScreenService';

vi.mock('../../../services/system/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(() => false),
    onChange: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../../../hooks/useResponsiveUI', () => ({
  useResponsiveUI: () => ({
    rs: (v: number) => v,
    rfs: (v: number) => v,
  }),
}));

vi.mock('../../../contexts/useTheme', () => ({
  useIsRetro: vi.fn(() => false),
}));

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

describe('AchievementPopup', () => {
  const achievement = {
    name: 'Diamond Hands',
    icon: '💎',
    color: '#00ffcc',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when achievement is null', () => {
    const { container } = render(<AchievementPopup achievement={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders desktop achievement content', () => {
    // @ts-expect-error testing mock
    screenService.isMobile.mockReturnValue(false);
    render(<AchievementPopup achievement={achievement} />);

    expect(screen.getByText('hud.achievement')).toBeInTheDocument();
    expect(screen.getByText('Diamond Hands')).toBeInTheDocument();
    expect(screen.getByText('💎')).toBeInTheDocument();
  });

  it('renders mobile layout when screen is mobile', () => {
    // @ts-expect-error testing mock
    screenService.isMobile.mockReturnValue(true);
    render(<AchievementPopup achievement={achievement} />);

    expect(screen.getByText('HUD.ACHIEVEMENT')).toBeInTheDocument();
    expect(screen.getByText('Diamond Hands')).toBeInTheDocument();
  });
});
