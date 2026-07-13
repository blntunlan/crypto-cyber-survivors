(function installCryptoSurvivorsE2EMocks() {
  if (window.__CCS_E2E_MOCKS_INSTALLED__) {
    return;
  }

  window.__CCS_E2E_MOCKS_INSTALLED__ = true;

  const originalFetch = window.fetch.bind(window);
  const ORIGINAL_EVENT_SOURCE = window.EventSource;
  const DEFAULT_PROFILE_ID = '00000000-0000-4000-a000-000000000000';
  const pairBasePrice = {
    BTC: 74651.92,
    ETH: 3488.21,
    SOL: 182.44,
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function readStoredUser() {
    try {
      const raw = window.localStorage.getItem('crypto_survivors_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function normalizeNickname(nickname) {
    const candidate = (nickname || 'E2ETester')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');
    return candidate.slice(0, 16) || 'e2etester';
  }

  function buildProfileResponse() {
    const user = readStoredUser();
    const timestamp = nowIso();
    const nickname = user?.nickname || 'E2ETester';

    return {
      id: user?.profileId || DEFAULT_PROFILE_ID,
      auth_user_id: null,
      email: null,
      email_verified: false,
      display_name: nickname,
      username: normalizeNickname(nickname),
      avatar_url: null,
      level: 12,
      xp: 3450,
      is_tester: true,
      is_banned: false,
      primary_auth_provider: 'nickname',
      created_at: timestamp,
      last_seen_at: timestamp,
      updated_at: timestamp,
    };
  }

  function buildLeaderboardResponse() {
    const currentProfile = buildProfileResponse();
    const entries = Array.from({ length: 10 }, (_, index) => ({
      profile_id: index === 2 ? currentProfile.id : `mock-profile-${index + 1}`,
      display_name: index === 2 ? currentProfile.display_name : `Runner ${index + 1}`,
      avatar_url: null,
      primary_auth_provider: 'nickname',
      high_score: 2500 - index * 100,
      max_survival_time: 900 - index * 30,
      total_kills: 400 - index * 10,
      total_sessions: 30 - index,
    }));

    return { data: entries };
  }

  function buildChallengeResponse(type) {
    const isDaily = type === 'daily';

    return {
      id: `mock-${type}-challenge`,
      type,
      name: isDaily ? 'Daily Drift Protocol' : 'Weekly Liquidation Hunt',
      description: isDaily
        ? 'Survive the opening drift and stabilize your position.'
        : 'Push deeper into volatility and clear a higher-risk contract.',
      constraints: isDaily
        ? [{ type: 'position', value: 'LONG' }]
        : [{ type: 'leverage_min', value: 10 }],
      objectives: isDaily
        ? [{ type: 'survive_seconds', target: 120, current: 0, completed: false }]
        : [
            { type: 'kill_count', target: 75, current: 0, completed: false },
            { type: 'reach_level', target: 8, current: 0, completed: false },
          ],
      reward: {
        metaCoins: isDaily ? 50 : 200,
        bonusXp: isDaily ? 100 : 500,
      },
      expiresAt: new Date(
        Date.now() + (isDaily ? 24 : 7 * 24) * 60 * 60 * 1000
      ).toISOString(),
      seed: isDaily ? 1 : 7,
    };
  }

  function buildMarketHistory(pair, limit) {
    const safeLimit = Math.max(10, Math.min(limit || 120, 300));
    const base = pairBasePrice[pair] || pairBasePrice.BTC;
    const start = Date.now() - safeLimit * 1000;

    return Array.from({ length: safeLimit }, (_, index) => {
      const wave = Math.sin(index / 8) * base * 0.0025;
      const drift = index * base * 0.00008;
      return {
        price: Number((base + wave + drift).toFixed(2)),
        volume: 1000 + index * 3,
        timestamp: start + index * 1000,
      };
    });
  }

  function jsonResponse(payload, init) {
    return Promise.resolve(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        ...init,
      })
    );
  }

  function parseRequestUrl(input) {
    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof Request
          ? input.url
          : input.url;
    return new URL(rawUrl, window.location.origin);
  }

  function decodeBody(init) {
    if (!init || typeof init.body !== 'string') {
      return {};
    }

    try {
      return JSON.parse(init.body);
    } catch {
      return {};
    }
  }

  window.fetch = async function mockFetch(input, init) {
    const url = parseRequestUrl(input);
    const pathname = url.pathname;

    if (pathname.includes('/api/v1/market/history')) {
      const pair = url.searchParams.get('pair') || 'BTC';
      const limit = Number(url.searchParams.get('limit') || '120');
      return jsonResponse(buildMarketHistory(pair, limit));
    }

    if (pathname.includes('/api/v1/economy/wallet')) {
      return jsonResponse({ wallet: { balance: 1337 } });
    }

    if (pathname.includes('/api/v1/economy/cash-out/quote')) {
      const issuedAtSeconds = Math.floor(Date.now() / 1000);
      return jsonResponse({
        quote: {
          quoteId: `e2e-quote-${Date.now()}`,
          canonicalSequence: 1,
          rewardPoints: 100,
          issuedAtSeconds,
          expiresAtSeconds: issuedAtSeconds + 30,
        },
        signature: 'e2e-cash-out-signature',
        shouldForceRecovery: false,
        safeExitOnly: false,
      });
    }

    if (pathname.includes('/api/v1/economy/cash-out/decision')) {
      return jsonResponse({
        state: 'settled',
        rewardPoints: 100,
        greedDelta: 1,
      });
    }

    if (pathname.includes('/api/v1/economy/cash-out/failure')) {
      return jsonResponse({
        state: 'failed',
        primaryRewardPoints: 0,
        shards: 0,
      });
    }

    if (pathname.includes('/api/v1/wallet/balance')) {
      return jsonResponse({ balance: 1337 });
    }

    if (pathname.includes('/api/v1/profile')) {
      const profile = buildProfileResponse();
      const patch = decodeBody(init);
      if (typeof patch.nickname === 'string' && patch.nickname.trim()) {
        profile.display_name = patch.nickname.trim();
        profile.username = normalizeNickname(profile.display_name);
      }
      if (typeof patch.avatar_url === 'string') {
        profile.avatar_url = patch.avatar_url;
      }
      return jsonResponse(profile);
    }

    if (pathname.includes('/api/v1/leaderboard')) {
      return jsonResponse(buildLeaderboardResponse());
    }

    if (pathname.includes('/api/v1/challenges/today')) {
      return jsonResponse(buildChallengeResponse('daily'));
    }

    if (pathname.includes('/api/v1/challenges/weekly')) {
      return jsonResponse(buildChallengeResponse('weekly'));
    }

    if (pathname.includes('/api/v1/challenges/status')) {
      return jsonResponse({
        dailyCompleted: false,
        weeklyCompleted: false,
      });
    }

    if (pathname.includes('/api/v1/challenges/complete')) {
      return jsonResponse({
        success: true,
        reward: {
          metaCoins: 50,
          bonusXp: 100,
        },
      });
    }

    if (pathname.includes('/api/v1/sessions/start')) {
      const body = decodeBody(init);
      const sessionId = `e2e-session-${Date.now()}`;
      return jsonResponse({
        sessionId,
        startTime: nowIso(),
        sessionSecret: `secret-${body.pair || 'BTC'}-${body.position || 'LONG'}`,
      });
    }

    if (pathname.includes('/api/v1/sessions/verify')) {
      return jsonResponse({
        success: true,
        verified: true,
        reward: 0,
        metaShare: 0,
        pnl: 0,
      });
    }

    if (pathname.includes('/api/v1/sessions/sync')) {
      return jsonResponse({ success: true, synced: true });
    }

    if (pathname.includes('/api/v1/telemetry/performance-metrics')) {
      return jsonResponse({ success: true });
    }

    if (pathname.includes('/api/v1/telemetry/device-profiles')) {
      return jsonResponse({ success: true });
    }

    if (pathname.includes('/api/v1/replays/save')) {
      return jsonResponse({
        replayId: `replay-${Date.now()}`,
        size: 256,
      });
    }

    if (pathname.includes('/api/v1/replays/mine')) {
      return jsonResponse({ replays: [] });
    }

    if (pathname.includes('/api/v1/replays/')) {
      const emptyReplay = btoa(
        JSON.stringify({
          sessionId: 'replay-session',
          duration: 0,
          position: 'LONG',
          leverage: 1,
          finalLevel: 1,
          totalKills: 0,
          snapshots: [],
          events: [],
        })
      );

      return jsonResponse({ replayData: emptyReplay });
    }

    if (pathname.includes('/api/v1/')) {
      return jsonResponse({ success: true });
    }

    try {
      return await originalFetch(input, init);
    } catch (error) {
      if (pathname.includes('/locales/')) {
        return jsonResponse({});
      }
      throw error;
    }
  };

  class MockEventSource {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSED = 2;

    constructor(url) {
      this.url = url;
      this.readyState = MockEventSource.CONNECTING;
      this.withCredentials = false;
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      this._listeners = {
        open: [],
        message: [],
        error: [],
      };
      this._seq = 0;
      this._intervalId = null;
      this._bootstrapId = window.setTimeout(() => {
        if (this.readyState === MockEventSource.CLOSED) {
          return;
        }

        this.readyState = MockEventSource.OPEN;
        this._dispatch('open', {});
        this._emitMessage({
          type: 'connected',
          pair: this._pair(),
          timestamp: Date.now(),
        });
        this._intervalId = window.setInterval(() => {
          this._emitMessage(this._nextTick());
        }, 250);
      }, 10);
    }

    addEventListener(type, listener) {
      if (!this._listeners[type]) {
        this._listeners[type] = [];
      }
      this._listeners[type].push(listener);
    }

    removeEventListener(type, listener) {
      const listeners = this._listeners[type];
      if (!listeners) {
        return;
      }
      this._listeners[type] = listeners.filter(candidate => candidate !== listener);
    }

    close() {
      this.readyState = MockEventSource.CLOSED;
      if (this._bootstrapId !== null) {
        window.clearTimeout(this._bootstrapId);
      }
      if (this._intervalId !== null) {
        window.clearInterval(this._intervalId);
      }
    }

    _pair() {
      try {
        return (
          new URL(this.url, window.location.origin).searchParams.get('pair') || 'BTC'
        );
      } catch {
        return 'BTC';
      }
    }

    _dispatch(type, event) {
      const handler = this[`on${type}`];
      if (typeof handler === 'function') {
        handler.call(this, event);
      }
      for (const listener of this._listeners[type] || []) {
        listener.call(this, event);
      }
    }

    _emitMessage(payload) {
      this._dispatch('message', { data: JSON.stringify(payload) });
    }

    _nextTick() {
      this._seq += 1;
      const pair = this._pair();
      const base = pairBasePrice[pair] || pairBasePrice.BTC;
      const drift = Math.sin(this._seq / 5) * base * 0.0015;
      const price = Number((base + drift + this._seq * 0.15).toFixed(2));

      return {
        pair,
        price,
        volume: 1000 + this._seq * 5,
        high: Number((price * 1.002).toFixed(2)),
        low: Number((price * 0.998).toFixed(2)),
        rsi: 50 + Math.sin(this._seq / 4) * 8,
        rsiState: 'NEUTRAL',
        atrPercent: 1.2,
        normalizedVolume: 0.6,
        volumePercentile: 62,
        whaleTier: this._seq % 15 === 0 ? 1 : 0,
        spawnRateMultiplier: 1.05,
        enemyAggroMultiplierLong: 1.02,
        enemyAggroMultiplierShort: 0.98,
        trendStrength: 0.35,
        trendDirection: 'UP',
        timestamp: Date.now(),
      };
    }
  }

  window.EventSource = MockEventSource;
  window.__CCS_E2E_ORIGINAL_EVENT_SOURCE__ = ORIGINAL_EVENT_SOURCE;
})();
