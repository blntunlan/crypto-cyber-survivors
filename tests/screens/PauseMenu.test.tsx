import { render, screen, fireEvent } from '../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PauseMenu } from '../../components/screens/PauseMenu';
import { TimeService } from '../../services/core/TimeService';

// Mock TimeService
vi.mock('../../services/core/TimeService', () => ({
  TimeService: {
    getGameTimeSeconds: vi.fn(),
  },
}));

describe('PauseMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockStats = {
    totalKills: 10,
    maxStreak: 5,
    totalBonusXp: 100,
  };

  it('should render stats correctly', () => {
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(60);

    render(
      <PauseMenu
        runStats={mockStats}
        onResume={() => {}}
        onRestart={() => {}}
        onMainMenu={() => {}}
        onOpenSettings={() => {}}
        isMuted={false}
        onToggleMute={() => {}}
      />
    );
    expect(screen.getByText('10')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('100')).toBeDefined();

    // 60 seconds = 1:00
    // Use regex to be safer or exact string if possible
    expect(screen.getByText(/1:00/)).toBeDefined();
  });

  it('shows limited pause UI when seconds remaining are low', () => {
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(95);

    const { container } = render(
      <PauseMenu
        runStats={mockStats}
        onResume={() => {}}
        onRestart={() => {}}
        onMainMenu={() => {}}
        onOpenSettings={() => {}}
        isMuted={false}
        onToggleMute={() => {}}
        pauseSecondsRemaining={2.2}
        pauseSecondsMax={10}
      />
    );

    expect(
      screen.getByText(content => content.includes('common.auto_resume'))
    ).toBeInTheDocument();
    expect(
      screen.getByText(content => content.includes('common.limited_pause'))
    ).toBeInTheDocument();
    expect(screen.getByText('3s')).toBeInTheDocument();

    const progress = container.querySelector('[style*="width: 22"]');
    expect(progress).not.toBeNull();
  });

  it('hides limited pause UI when remaining seconds are null', () => {
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(125);

    render(
      <PauseMenu
        runStats={mockStats}
        onResume={() => {}}
        onRestart={() => {}}
        onMainMenu={() => {}}
        onOpenSettings={() => {}}
        isMuted={false}
        onToggleMute={() => {}}
        pauseSecondsRemaining={null}
      />
    );

    expect(screen.queryByText('common.auto_resume')).not.toBeInTheDocument();
    expect(screen.queryByText('common.limited_pause')).not.toBeInTheDocument();
  });

  it('should call onResume when Resume button is clicked', () => {
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(60);
    const onResume = vi.fn();
    render(
      <PauseMenu
        runStats={mockStats}
        onResume={onResume}
        onRestart={() => {}}
        onMainMenu={() => {}}
        onOpenSettings={() => {}}
        isMuted={false}
        onToggleMute={() => {}}
      />
    );
    fireEvent.click(screen.getByText(/Resume/i));
    expect(onResume).toHaveBeenCalled();
  });

  it('should call onRestart when Restart button is clicked', () => {
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(60);
    const onRestart = vi.fn();
    render(
      <PauseMenu
        runStats={mockStats}
        onResume={() => {}}
        onRestart={onRestart}
        onMainMenu={() => {}}
        onOpenSettings={() => {}}
        isMuted={false}
        onToggleMute={() => {}}
      />
    );
    fireEvent.click(screen.getByText(/Restart/i));
    expect(onRestart).toHaveBeenCalled();
  });

  it('routes main menu / settings / mute callbacks and shows muted label', () => {
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(60);
    const onMainMenu = vi.fn();
    const onOpenSettings = vi.fn();
    const onToggleMute = vi.fn();

    render(
      <PauseMenu
        runStats={mockStats}
        onResume={() => {}}
        onRestart={() => {}}
        onMainMenu={onMainMenu}
        onOpenSettings={onOpenSettings}
        isMuted={true}
        onToggleMute={onToggleMute}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'common.back' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'settings.muted' }));

    expect(onMainMenu).toHaveBeenCalledTimes(1);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(onToggleMute).toHaveBeenCalledTimes(1);
  });
});
