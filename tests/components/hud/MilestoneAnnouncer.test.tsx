import { render, screen } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MilestoneAnnouncer } from '../../../components/hud/MilestoneAnnouncer';
import { screenService } from '../../../services/system/ScreenService';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  LazyMotion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  domAnimation: {},
  m: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('../../../services/system/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(() => false),
    onChange: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../../../hooks/useResponsiveUI', () => ({
  useResponsiveUI: () => ({
    rs: (value: number) => value,
    rfs: (value: number) => value,
  }),
}));

vi.mock('../../../contexts/useTheme', () => ({
  useIsRetro: vi.fn(() => false),
}));

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

describe('MilestoneAnnouncer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(screenService.isMobile).mockReturnValue(false);
  });

  it('renders milestone feedback as a gold event rail', () => {
    render(
      <MilestoneAnnouncer
        announcement={{
          seq: 1,
          kind: 'milestone',
          name: 'Market Mastery',
          color: '#D6B85C',
          icon: '◆',
        }}
      />
    );

    const rail = screen.getByTestId('hud-event-rail');
    expect(rail).toHaveAttribute('data-hud-tone', 'gold');
    expect(rail).toHaveTextContent('milestones.milestone_badge');
    expect(rail).not.toHaveClass('backdrop-blur');
  });
});
