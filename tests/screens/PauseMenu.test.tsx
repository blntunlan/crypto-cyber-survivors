import { render, screen, fireEvent } from '../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PauseMenu } from '../../components/screens/PauseMenu';
import { TimeService } from '../../services/TimeService';

// Mock TimeService
vi.mock('../../services/TimeService', () => ({
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
});
