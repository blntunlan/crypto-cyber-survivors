import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '../../test-utils';
import { WaveTimer } from '../../../components/hud/WaveTimer';
import { EventBus } from '../../../services/core/EventBus';

vi.mock('../../../services/system/ScreenService', () => ({
  screenService: {
    isMobile: vi.fn(() => false),
    onChange: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../../../hooks/useResponsiveUI', () => ({
  useResponsiveUI: () => ({
    rfs: (v: number) => v,
    isVeryNarrow: false,
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

vi.mock('../../../services/core/TimeService', () => ({
  TimeService: {
    getGameTimeSeconds: vi.fn(() => 65),
  },
}));

describe('WaveTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial formatted time from TimeService', () => {
    render(<WaveTimer />);
    expect(screen.getByText('1:05')).toBeInTheDocument();
  });

  it('updates time on secondElapsed and resets on gameReset', () => {
    render(<WaveTimer />);

    act(() => {
      EventBus.emit('secondElapsed', { totalSeconds: 130 });
    });
    expect(screen.getByText('2:10')).toBeInTheDocument();

    act(() => {
      EventBus.emit('gameReset');
    });
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });
});
