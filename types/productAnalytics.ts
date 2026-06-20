export type ProductAnalyticsEventType =
  | 'wallet_connected'
  | 'wallet_connect_failed'
  | 'season_joined'
  | 'quest_completed'
  | 'leaderboard_submitted'
  | 'leaderboard_viewed'
  | 'referral_joined';

export type ProductAnalyticsMetadata = Record<
  string,
  string | number | boolean | null | undefined
>;

export type ProductAnalyticsEvent = {
  eventType: ProductAnalyticsEventType;
  profileId?: string | null;
  sessionId?: string | null;
  seasonId?: string | null;
  questId?: string | null;
  referralCode?: string | null;
  walletProvider?: 'phantom' | 'solflare' | 'backpack' | 'unknown' | null;
  walletAddressHash?: string | null;
  metadata?: ProductAnalyticsMetadata;
};
