// @ts-nocheck - This file runs in Deno (Supabase Edge Functions), not Node.js
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/**
 * Verify Replay - Supabase Edge Function
 *
 * Verifies the integrity of a game replay by:
 * 1. Checking hash chain integrity
 * 2. Simulating the game from events
 * 3. Comparing simulated stats with claimed stats
 *
 * This provides a strong anti-cheat mechanism by detecting
 * impossible or manipulated game sessions.
 */

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://crypto-survivors.com',
  'https://crypto-survivors.up.railway.app',
  'https://crypto-cyber-survivors-production.up.railway.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://crypto-cyber-survivors.vercel.app',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

// Event types (must match client)
enum ReplayEventType {
  SESSION_START = 'SESSION_START',
  SESSION_END = 'SESSION_END',
  HEARTBEAT = 'HEARTBEAT',
  PLAYER_MOVE = 'PLAYER_MOVE',
  PLAYER_SHOOT = 'PLAYER_SHOOT',
  PLAYER_DASH = 'PLAYER_DASH',
  LEVEL_UP = 'LEVEL_UP',
  CARD_SELECT = 'CARD_SELECT',
  ENEMY_SPAWN = 'ENEMY_SPAWN',
  ENEMY_KILL = 'ENEMY_KILL',
  DAMAGE_DEALT = 'DAMAGE_DEALT',
  DAMAGE_TAKEN = 'DAMAGE_TAKEN',
  XP_GAINED = 'XP_GAINED',
  GOLD_COLLECTED = 'GOLD_COLLECTED',
  GEM_COLLECTED = 'GEM_COLLECTED',
  BUFF_COLLECTED = 'BUFF_COLLECTED',
  PRICE_UPDATE = 'PRICE_UPDATE',
  POSITION_CHANGE = 'POSITION_CHANGE',
  BUFF_APPLIED = 'BUFF_APPLIED',
  BUFF_EXPIRED = 'BUFF_EXPIRED',
}

interface ReplayEvent {
  type: ReplayEventType;
  timestamp: number;
  data: unknown;
  hash: string;
  sequence: number;
}

interface ReplayMetadata {
  replayId: string;
  sessionId: string;
  playerId: string;
  startTime: string;
  durationMs: number;
  eventCount: number;
  finalHash: string;
  compressedSize: number;
  gameVersion: string;
}

interface ClaimedStats {
  level: number;
  kills: number;
  damageDealt: number;
  damageTaken: number;
  xpGained: number;
  goldCollected: number;
  pnlPercent: number;
}

interface VerificationRequest {
  sessionId: string;
  metadata: ReplayMetadata;
  replayData: string;
  claimedStats: ClaimedStats;
}

// Verification tolerances
const TOLERANCE = {
  STATS: 0.05, // 5% tolerance for stat differences
  TIME_BETWEEN_EVENTS_MIN: 0, // Minimum ms between events
  TIME_BETWEEN_EVENTS_MAX: 60000, // Maximum ms between events
  MAX_KILLS_PER_SECOND: 10, // Maximum reasonable kills per second
};

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const data: VerificationRequest = await req.json();
    const { sessionId, metadata, replayData, claimedStats } = data;

    // 1. Decompress and parse replay
    let events: ReplayEvent[];
    try {
      const decodedData = atob(replayData);
      const jsonData = decodeURIComponent(decodedData);
      events = JSON.parse(jsonData);
    } catch (_e) {
      return jsonResponse(
        { valid: false, reason: 'INVALID_REPLAY_FORMAT' },
        400,
        corsHeaders
      );
    }

    // 2. Fetch session secret from database
    const { data: session, error: sessionFetchError } = await supabaseClient
      .from('game_sessions')
      .select('session_secret')
      .eq('session_id', sessionId)
      .single();

    if (sessionFetchError || !session?.session_secret) {
      return jsonResponse(
        { valid: false, reason: 'SESSION_NOT_FOUND' },
        400,
        corsHeaders
      );
    }

    const sessionSecret = session.session_secret;

    // 3. Verify hash chain integrity
    const chainResult = verifyHashChain(events, sessionSecret);
    if (!chainResult.valid) {
      await logVerificationFailure(
        supabaseClient,
        sessionId,
        'CHAIN_BROKEN',
        chainResult
      );
      return jsonResponse(
        { valid: false, reason: 'CHAIN_BROKEN', index: chainResult.brokenAt },
        200,
        corsHeaders
      );
    }

    // 3. Verify event sequence
    const sequenceResult = verifyEventSequence(events);
    if (!sequenceResult.valid) {
      await logVerificationFailure(
        supabaseClient,
        sessionId,
        'INVALID_SEQUENCE',
        sequenceResult
      );
      return jsonResponse(
        { valid: false, reason: 'INVALID_SEQUENCE', details: sequenceResult.reason },
        200,
        corsHeaders
      );
    }

    // 4. Simulate game from events
    const simulatedStats = simulateGame(events);

    // 5. Compare simulated stats with claimed stats
    const comparison = compareStats(simulatedStats, claimedStats);
    if (!comparison.valid) {
      await logVerificationFailure(
        supabaseClient,
        sessionId,
        'STATS_MISMATCH',
        comparison
      );
      return jsonResponse(
        {
          valid: false,
          reason: 'STATS_MISMATCH',
          discrepancies: comparison.discrepancies,
        },
        200,
        corsHeaders
      );
    }

    // 6. Check for impossible gameplay patterns
    const patternResult = checkImpossiblePatterns(events);
    if (!patternResult.valid) {
      await logVerificationFailure(
        supabaseClient,
        sessionId,
        'SUSPICIOUS_PATTERN',
        patternResult
      );
      return jsonResponse(
        {
          valid: false,
          reason: 'SUSPICIOUS_PATTERN',
          details: patternResult.reason,
        },
        200,
        corsHeaders
      );
    }

    // 7. All checks passed - update session as verified
    await supabaseClient
      .from('game_sessions')
      .update({
        replay_verified: true,
        replay_hash: metadata.finalHash,
        verification_method: 'replay_verified',
        verified_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId);

    // 8. Store replay for future reference (optional)
    await supabaseClient.from('game_replays').insert({
      session_id: sessionId,
      replay_id: metadata.replayId,
      event_count: metadata.eventCount,
      duration_ms: metadata.durationMs,
      final_hash: metadata.finalHash,
      compressed_size: metadata.compressedSize,
      game_version: metadata.gameVersion,
      verified: true,
      // Note: We don't store the full replay data to save space
      // It can be requested from the client if needed for dispute resolution
    });

    return jsonResponse(
      {
        valid: true,
        replayHash: metadata.finalHash,
        verifiedAt: new Date().toISOString(),
        simulatedStats,
      },
      200,
      corsHeaders
    );
  } catch (error) {
    console.error('Verification error:', error);
    return jsonResponse({ error: (error as Error).message }, 400, corsHeaders);
  }
});

// =============================================================================
// VERIFICATION FUNCTIONS
// =============================================================================

/**
 * Verify hash chain integrity
 */
function verifyHashChain(
  events: ReplayEvent[],
  secret: string
): { valid: boolean; brokenAt?: number } {
  let previousHash = '0';

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // Recompute expected hash - MUST match EventRecorderService.ts
    const expectedHash = quickHash(
      JSON.stringify({
        secret,
        previousHash,
        type: event.type,
        data: event.data,
        timestamp: event.timestamp,
        sequence: event.sequence,
      })
    );

    if (event.hash !== expectedHash) {
      return { valid: false, brokenAt: i };
    }

    previousHash = event.hash;
  }

  return { valid: true };
}

/**
 * Verify event sequence is valid
 */
function verifyEventSequence(events: ReplayEvent[]): {
  valid: boolean;
  reason?: string;
} {
  if (events.length === 0) {
    return { valid: false, reason: 'Empty replay' };
  }

  // First event must be SESSION_START
  if (events[0].type !== ReplayEventType.SESSION_START) {
    return { valid: false, reason: 'Missing SESSION_START' };
  }

  // Last event must be SESSION_END
  if (events[events.length - 1].type !== ReplayEventType.SESSION_END) {
    return { valid: false, reason: 'Missing SESSION_END' };
  }

  // Check sequence numbers
  for (let i = 0; i < events.length; i++) {
    if (events[i].sequence !== i) {
      return { valid: false, reason: `Invalid sequence at index ${i}` };
    }
  }

  // Check timestamps are monotonically increasing
  for (let i = 1; i < events.length; i++) {
    if (events[i].timestamp < events[i - 1].timestamp) {
      return { valid: false, reason: `Timestamp decreased at index ${i}` };
    }
  }

  return { valid: true };
}

/**
 * Simulate game from events
 */
function simulateGame(events: ReplayEvent[]): ClaimedStats {
  const stats: ClaimedStats = {
    level: 1,
    kills: 0,
    damageDealt: 0,
    damageTaken: 0,
    xpGained: 0,
    goldCollected: 0,
    pnlPercent: 0,
  };

  for (const event of events) {
    switch (event.type) {
      case ReplayEventType.ENEMY_KILL:
        stats.kills++;
        if (event.data?.damage) {
          stats.damageDealt += event.data.damage;
        }
        break;

      case ReplayEventType.DAMAGE_TAKEN:
        if (event.data?.amount) {
          stats.damageTaken += event.data.amount;
        }
        break;

      case ReplayEventType.XP_GAINED:
        if (event.data?.amount) {
          stats.xpGained += event.data.amount;
        }
        break;

      case ReplayEventType.GOLD_COLLECTED:
      case ReplayEventType.GEM_COLLECTED:
        if (event.data?.value) {
          stats.goldCollected += event.data.value;
        }
        break;

      case ReplayEventType.LEVEL_UP:
        if (event.data?.newLevel) {
          stats.level = event.data.newLevel;
        }
        break;

      case ReplayEventType.SESSION_END:
        if (event.data?.pnlPercent !== undefined) {
          stats.pnlPercent = event.data.pnlPercent;
        }
        break;
    }
  }

  return stats;
}

/**
 * Compare simulated stats with claimed stats
 */
function compareStats(
  simulated: ClaimedStats,
  claimed: ClaimedStats
): { valid: boolean; discrepancies?: string[] } {
  const discrepancies: string[] = [];

  // Check each stat with tolerance
  const checkStat = (name: string, sim: number, claim: number) => {
    if (claim === 0 && sim === 0) return;
    const diff = Math.abs(sim - claim) / Math.max(sim, claim, 1);
    if (diff > TOLERANCE.STATS) {
      discrepancies.push(`${name}: simulated=${sim}, claimed=${claim}`);
    }
  };

  checkStat('level', simulated.level, claimed.level);
  checkStat('kills', simulated.kills, claimed.kills);
  checkStat('damageDealt', simulated.damageDealt, claimed.damageDealt);
  checkStat('damageTaken', simulated.damageTaken, claimed.damageTaken);
  checkStat('xpGained', simulated.xpGained, claimed.xpGained);
  checkStat('goldCollected', simulated.goldCollected, claimed.goldCollected);

  return {
    valid: discrepancies.length === 0,
    discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
  };
}

/**
 * Check for impossible gameplay patterns
 */
function checkImpossiblePatterns(events: ReplayEvent[]): {
  valid: boolean;
  reason?: string;
} {
  // Calculate kill rate
  const killEvents = events.filter(e => e.type === ReplayEventType.ENEMY_KILL);
  if (killEvents.length > 0) {
    const firstKill = killEvents[0].timestamp;
    const lastKill = killEvents[killEvents.length - 1].timestamp;
    const duration = (lastKill - firstKill) / 1000; // seconds

    if (duration > 0) {
      const killsPerSecond = killEvents.length / duration;
      if (killsPerSecond > TOLERANCE.MAX_KILLS_PER_SECOND) {
        return {
          valid: false,
          reason: `Kill rate too high: ${killsPerSecond.toFixed(2)}/s`,
        };
      }
    }
  }

  // Check for suspicious event timing
  for (let i = 1; i < events.length; i++) {
    const timeDiff = events[i].timestamp - events[i - 1].timestamp;
    if (timeDiff > TOLERANCE.TIME_BETWEEN_EVENTS_MAX) {
      // Large gap could indicate pause/resume manipulation
      // But we allow it for now since game can be paused
    }
  }

  return { valid: true };
}

/**
 * Log verification failure for analysis
 */
async function logVerificationFailure(
  supabase: unknown,
  sessionId: string,
  reason: string,
  details: unknown
): Promise<void> {
  try {
    // deno-lint-ignore no-explicit-any
    await (supabase as any).from('verification_failures').insert({
      session_id: sessionId,
      failure_reason: reason,
      details: JSON.stringify(details),
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Failed to log verification failure:', e);
  }
}

/**
 * Simple hash function (must match client implementation)
 */
function quickHash(message: string): string {
  let hash = 5381;
  for (let i = 0; i < message.length; i++) {
    hash = (hash * 33) ^ message.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * JSON response helper
 */
function jsonResponse(
  data: unknown,
  status: number,
  headers: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
