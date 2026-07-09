import { render, screen } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChallengeProgressHUD } from '../../../components/hud/ChallengeProgressHUD';
import { ChallengeService } from '../../../services/challenges/ChallengeService';
import { EventBus } from '../../../services/core/EventBus';

vi.mock('../../../services/challenges/ChallengeService', () => ({
  ChallengeService: {
    getActiveChallenge: vi.fn(),
    getObjectives: vi.fn(),
  },
}));

vi.mock('../../../services/core/EventBus', () => ({
  EventBus: {
    on: vi.fn(() => vi.fn()),
  },
}));

describe('ChallengeProgressHUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ChallengeService.getActiveChallenge).mockReturnValue({} as never);
    vi.mocked(ChallengeService.getObjectives).mockReturnValue([
      { type: 'kill_enemies', current: 4, target: 10, completed: false },
    ] as never);
  });

  it('renders challenge progress as a transparent gold rail', () => {
    render(<ChallengeProgressHUD />);

    const rail = screen.getByTestId('challenge-progress-rail');
    expect(rail).toHaveAttribute('data-hud-tone', 'gold');
    expect(rail).toHaveTextContent('CHALLENGE');
    expect(rail).toHaveTextContent('4/10');
    expect(rail).not.toHaveClass('bg-black');
  });

  it('does not render when there is no active challenge', () => {
    vi.mocked(ChallengeService.getActiveChallenge).mockReturnValue(null);
    render(<ChallengeProgressHUD />);

    expect(screen.queryByTestId('challenge-progress-rail')).not.toBeInTheDocument();
    expect(EventBus.on).not.toHaveBeenCalled();
  });
});
