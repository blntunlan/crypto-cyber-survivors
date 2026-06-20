export const ACTIVE_SEASON_ID = 'solana-alpha-2026-q3';

export const SEASON_CONFIG = {
  id: ACTIVE_SEASON_ID,
  name: 'Solana Alpha Season',
  startsAt: '2026-06-20T00:00:00.000Z',
  endsAt: '2026-09-18T23:59:59.999Z',
  ecosystem: 'solana',
  scoring: {
    survivalSecondPoints: 2,
    killPoints: 5,
    levelPoints: 100,
    questCompletionPoints: 500,
    walletIdentityBonus: 250,
    maxRunPoints: 50_000,
  },
} as const;
