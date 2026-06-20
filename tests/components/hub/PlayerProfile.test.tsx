import { fireEvent, render, screen, waitFor } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerProfile } from '../../../components/hub/PlayerProfile';
import { type FullProfileData } from '../../../types/profile';

const mocks = vi.hoisted(() => ({
  getFullProfile: vi.fn(),
}));

vi.mock('../../../services/auth/ProfileStatsService', () => ({
  ProfileStatsService: {
    getInstance: vi.fn(() => ({
      getFullProfile: mocks.getFullProfile,
    })),
  },
}));

const makeProfile = (overrides: Partial<FullProfileData> = {}): FullProfileData => ({
  id: 'profile-1',
  displayName: 'Pilot',
  username: null,
  avatarUrl: null,
  level: 1,
  xp: 0,
  isTester: false,
  primaryAuthProvider: 'nickname',
  createdAt: '2026-06-21T00:00:00.000Z',
  stats: {
    totalKills: 0,
    totalSurvivalTime: 0,
    totalGames: 0,
    maxSurvivalTime: 0,
    maxKills: 0,
    totalGoldEarned: 0,
    goldBalance: 10,
    gemsBalance: 0,
    source: 'unavailable',
    hasVerifiedRuns: false,
  },
  achievements: {
    all: [],
    unlocked: [],
  },
  ...overrides,
});

describe('PlayerProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFullProfile.mockResolvedValue(makeProfile());
  });

  it('shows explicit pending states instead of empty profile content', async () => {
    render(<PlayerProfile isOpen onClose={vi.fn()} />);

    expect(await screen.findByText('Profile stats pending')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.queryByText(/top 15%/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('profile.tabs.achievements'));

    await waitFor(() => {
      expect(screen.getByText('Achievements Pending')).toBeInTheDocument();
    });
  });
});
