import { ACTIVE_SEASON_ID } from '../../config/SeasonConfig';
import { type ProductAnalyticsEvent } from '../../types/productAnalytics';
import { isRailwayApiConfigured, railwayClient } from '../api/RailwayClient';
import { UserSessionService } from '../auth/UserSessionService';
import { Logger } from '../system/Logger';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCAL_ONLY_PROFILE_ID = '00000000-0000-4000-a000-000000000000';

function nullableUuid(value: string | null | undefined): string | null {
  return value && UUID_REGEX.test(value) ? value : null;
}

function nullableProfileId(value: string | null | undefined): string | null {
  return value === LOCAL_ONLY_PROFILE_ID ? null : nullableUuid(value);
}

function normalizeMetadata(
  metadata: ProductAnalyticsEvent['metadata']
): ProductAnalyticsEvent['metadata'] {
  if (!metadata) return {};

  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined)
  );
}

async function hashWalletAddress(walletAddress: string): Promise<string | null> {
  const normalized = walletAddress.trim().toLowerCase();
  if (!normalized) return null;

  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

class ProductAnalyticsServiceClass {
  private trackedSeasonIds = new Set<string>();

  async track(event: ProductAnalyticsEvent): Promise<void> {
    if (import.meta.env.VITE_ENABLE_ANALYTICS === 'false') return;
    if (!isRailwayApiConfigured()) return;

    const profileId = nullableProfileId(
      event.profileId ?? UserSessionService.getProfileId()
    );
    const sessionId = nullableUuid(event.sessionId);

    try {
      await railwayClient.post('/api/v1/telemetry/product-events', {
        event_type: event.eventType,
        profile_id: profileId,
        session_id: sessionId,
        season_id: event.seasonId ?? ACTIVE_SEASON_ID,
        quest_id: event.questId ?? null,
        referral_code: event.referralCode ?? null,
        wallet_provider: event.walletProvider ?? null,
        wallet_address_hash: event.walletAddressHash ?? null,
        metadata: normalizeMetadata(event.metadata),
      });
    } catch (error) {
      Logger.debug('[ProductAnalytics] Product event sync failed', {
        eventType: event.eventType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async trackWalletConnected(params: {
    walletProvider: NonNullable<ProductAnalyticsEvent['walletProvider']>;
    walletAddress: string;
  }): Promise<void> {
    await this.track({
      eventType: 'wallet_connected',
      walletProvider: params.walletProvider,
      walletAddressHash: await hashWalletAddress(params.walletAddress),
      metadata: {
        rawWalletStored: false,
      },
    });
  }

  async trackWalletConnectFailed(params: {
    walletProvider?: ProductAnalyticsEvent['walletProvider'];
    reason: string;
  }): Promise<void> {
    await this.track({
      eventType: 'wallet_connect_failed',
      walletProvider: params.walletProvider ?? 'unknown',
      metadata: {
        reason: params.reason,
      },
    });
  }

  async trackSeasonJoined(seasonId = ACTIVE_SEASON_ID): Promise<void> {
    if (this.trackedSeasonIds.has(seasonId)) return;
    this.trackedSeasonIds.add(seasonId);

    await this.track({
      eventType: 'season_joined',
      seasonId,
    });
  }

  async trackQuestCompleted(params: {
    questId: string;
    rewardMetaCoins?: number;
    rewardBonusXp?: number;
  }): Promise<void> {
    await this.track({
      eventType: 'quest_completed',
      questId: params.questId,
      metadata: {
        rewardMetaCoins: params.rewardMetaCoins,
        rewardBonusXp: params.rewardBonusXp,
      },
    });
  }

  async trackLeaderboardViewed(params: {
    sort: string;
    entryCount: number;
    source: 'api' | 'cache' | 'mock' | 'stale';
  }): Promise<void> {
    await this.track({
      eventType: 'leaderboard_viewed',
      metadata: {
        sort: params.sort,
        entryCount: params.entryCount,
        source: params.source,
      },
    });
  }
}

export const ProductAnalyticsService = new ProductAnalyticsServiceClass();
