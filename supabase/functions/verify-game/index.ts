// @ts-nocheck - This file runs in Deno (Supabase Edge Functions), not Node.js
// IDE errors are expected; see: https://supabase.com/docs/guides/functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Allowed origins for CORS - restrict in production
const ALLOWED_ORIGINS = [
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

// SOFT VERIFICATION - MVP tolerances (will tighten later)
const TOLERANCE = {
  PRICE: 0.02, // %2 - Allow for timing differences
  PNL: 0.05, // %5 - Allow for calculation differences
  TIME: 60000, // 60 seconds - Account for clock drift
  MAX_PNL: 5.0, // %500 - Relaxed absolute max
  MIN_SURVIVAL: 5, // 5 seconds minimum
  MAX_PNL_VELOCITY: 20.0, // %20 per second (Very generous upper bound)
};

// Reward calculation constants
const REWARD = {
  BASE_PER_SECOND: 0.1, // Each second 0.1 coin
  KILL_BONUS: 2, // Each kill 2 coin
  LEVEL_BONUS: 10, // Each level 10 coin
  PNL_MULTIPLIER: 50, // %1 PnL = 50 coin
  PNL_BONUS_MIN: -100, // Maximum penalty
  PNL_BONUS_MAX: 1000, // Maximum bonus (Increased)
};

interface GameSessionData {
  userId: string;
  pair: string;
  position: 'LONG' | 'SHORT';
  leverage: number;
  startTime: number;
  endTime: number;
  claimedEntryPrice: number;
  claimedExitPrice: number;
  claimedPnL: number;
  kills: number;
  level: number;
  goldCollected: number;
  survivalTimeMs: number;
  optimisticReward: number;
  sessionId: string;
}

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const data: GameSessionData = await req.json();
    const {
      userId,
      startTime,
      endTime,
      pair,
      position,
      leverage,
      claimedEntryPrice,
      claimedExitPrice,
      claimedPnL,
      kills,
      level,
      goldCollected,
      survivalTimeMs,
      optimisticReward,
      sessionId,
    } = data;

    // 1. SANITY CHECKS (Pre-computation)
    let verifiedStartTime = startTime;
    let isServerSession = false;

    // Check if session already exists on server (created by start-session)
    const { data: existingSession } = await supabaseClient
      .from('game_sessions')
      .select('start_time, is_verified, session_id')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existingSession) {
      isServerSession = true;
      if (existingSession.is_verified) {
        return new Response(
          JSON.stringify({ error: 'Session already verified', verified: false }),
          {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      // Use server's start time for truth
      verifiedStartTime = new Date(existingSession.start_time).getTime();
    }

    const sessionDuration = (endTime - verifiedStartTime) / 1000; // seconds

    if (sessionDuration < TOLERANCE.MIN_SURVIVAL) {
      return await rejectSession(
        supabaseClient,
        data,
        'rejected',
        'Session too short',
        corsHeaders
      );
    }

    // Lookup player ID from nickname (userId)
    const { data: player } = await supabaseClient
      .from('players')
      .select('id')
      .eq('display_name', userId)
      .single();

    if (!player) {
      return new Response(
        JSON.stringify({ error: 'Player not found', verified: false }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    const playerId = player.id;

    // Maximum PnL check (prevent obviously fake sessions)
    if (Math.abs(claimedPnL) > TOLERANCE.MAX_PNL * 100) {
      return await rejectSession(
        supabaseClient,
        data,
        'rejected',
        'PnL exceeds maximum threshold',
        corsHeaders
      );
    }

    // PnL Velocity Check (Anti-Cheat)
    if (sessionDuration > 0) {
      const pnlVelocity = Math.abs(claimedPnL) / sessionDuration;
      if (pnlVelocity > TOLERANCE.MAX_PNL_VELOCITY) {
        return await rejectSession(
          supabaseClient,
          data,
          'rejected',
          `PnL velocity too high (${pnlVelocity.toFixed(2)}%/s)`,
          corsHeaders
        );
      }
    }

    // 2. PRICE VERIFICATION
    const { data: entryPrices } = await supabaseClient
      .from('price_logs')
      .select('price, timestamp')
      .eq('pair', pair)
      .gte('timestamp', new Date(startTime - TOLERANCE.TIME).toISOString())
      .lte('timestamp', new Date(startTime + TOLERANCE.TIME).toISOString())
      .order('timestamp', { ascending: true })
      .limit(10);

    const { data: exitPrices } = await supabaseClient
      .from('price_logs')
      .select('price, timestamp')
      .eq('pair', pair)
      .gte('timestamp', new Date(endTime - TOLERANCE.TIME).toISOString())
      .lte('timestamp', new Date(endTime + TOLERANCE.TIME).toISOString())
      .order('timestamp', { ascending: false })
      .limit(10);

    // Determine verification method and prices
    let verifiedEntryPrice = claimedEntryPrice;
    let verifiedExitPrice = claimedExitPrice;
    let verifiedPnL = claimedPnL;
    let verificationMethod = isServerSession ? 'server_session_v2' : 'client_trust_v1';

    let priceDiffEntry = 0;
    let priceDiffExit = 0;
    let pnlDiffValue = 0;
    let timeDiffMs = 0;

    if (entryPrices && entryPrices.length > 0 && exitPrices && exitPrices.length > 0) {
      // Find closest price to claimed time
      verifiedEntryPrice = entryPrices[0].price;
      verifiedExitPrice = exitPrices[0].price;

      // Calculate server-side PnL
      const priceChange =
        position.toLowerCase() === 'long'
          ? (verifiedExitPrice - verifiedEntryPrice) / verifiedEntryPrice
          : (verifiedEntryPrice - verifiedExitPrice) / verifiedEntryPrice;

      verifiedPnL = priceChange * leverage * 100; // Percentage

      // Calculate diffs for analytics
      priceDiffEntry =
        Math.abs(claimedEntryPrice - verifiedEntryPrice) / verifiedEntryPrice;
      priceDiffExit =
        Math.abs(claimedExitPrice - verifiedExitPrice) / verifiedExitPrice;
      pnlDiffValue = Math.abs(claimedPnL - verifiedPnL);
      timeDiffMs = Math.abs(new Date(entryPrices[0].timestamp).getTime() - startTime);

      // Soft verification - just flag suspicious, don't reject
      if (priceDiffEntry > TOLERANCE.PRICE || priceDiffExit > TOLERANCE.PRICE) {
        verificationMethod = 'price_adjusted';
      } else if (pnlDiffValue > TOLERANCE.PNL * 100) {
        verificationMethod = 'pnl_adjusted';
      } else {
        verificationMethod = 'verified';
      }
    }

    // 3. REWARD CALCULATION
    const baseReward = sessionDuration * REWARD.BASE_PER_SECOND;
    const killBonus = kills * REWARD.KILL_BONUS;
    const levelBonus = level * REWARD.LEVEL_BONUS;

    const pnlBonus = Math.max(
      REWARD.PNL_BONUS_MIN,
      Math.min(REWARD.PNL_BONUS_MAX, verifiedPnL * REWARD.PNL_MULTIPLIER)
    );

    let reward = Math.max(0, baseReward + killBonus + levelBonus + pnlBonus);
    reward = Math.min(reward, 5000); // Global cap

    // 4. PERSIST & CREDIT REWARD
    await creditReward(supabaseClient, data, {
      playerId,
      reward,
      verifiedEntryPrice,
      verifiedExitPrice,
      verifiedPnL,
      priceDiffEntry,
      priceDiffExit,
      pnlDiff: pnlDiffValue,
      verificationMethod,
      isServerSession,
      verifiedStartTime,
    });

    return new Response(
      JSON.stringify({
        verified: true,
        reward: Math.floor(reward),
        verifiedPnL,
        method: verificationMethod,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Verification error:', error);

    // Log to error_reports table
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabaseClient.from('error_reports').insert({
        error_type: 'EdgeFunctionError',
        error_message: (error as Error).message,
        stack_trace: (error as Error).stack,
        severity: 'high',
        category: 'server',
        url: 'verify-game',
        status: 'new',
        context: {
          function: 'verify-game',
          runtime: 'Deno',
        },
      });
    } catch (logErr) {
      console.error('Failed to log error to database:', logErr);
    }

    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

async function creditReward(
  supabase: any,
  data: GameSessionData,
  verification: any
): Promise<void> {
  const { playerId, reward } = verification;

  // 1. Upsert game session
  const { error: sessionError } = await supabase.from('game_sessions').upsert(
    {
      player_id: playerId,
      user_id: playerId,
      session_id: data.sessionId,
      start_time: new Date(
        verification.isServerSession ? verification.verifiedStartTime : data.startTime
      ).toISOString(),
      end_time: new Date(data.endTime).toISOString(),
      survival_seconds: Math.floor((data.endTime - data.startTime) / 1000),
      crypto_pair: data.pair,
      position_chosen: data.position,
      leverage: data.leverage,
      claimed_entry_price: data.claimedEntryPrice,
      claimed_exit_price: data.claimedExitPrice,
      claimed_pnl: data.claimedPnL,
      verified_entry_price: verification.verifiedEntryPrice,
      verified_exit_price: verification.verifiedExitPrice,
      verified_pnl: verification.verifiedPnL,
      is_verified: true,
      verification_method: verification.verificationMethod,
      total_kills: data.kills,
      max_level: data.level,
      gold_collected: data.goldCollected,
      reward_amount: reward,
      reward_status: 'confirmed',
      price_diff_entry: verification.priceDiffEntry,
      price_diff_exit: verification.priceDiffExit,
      pnl_diff: verification.pnlDiff,
      // Note: verification_method already set on line 314
      verified_at: new Date().toISOString(),
      reward_credited_at: new Date().toISOString(),
    },
    { onConflict: 'session_id' }
  );

  if (sessionError) throw sessionError;

  // 2. CHECK & UNLOCK ACHIEVEMENTS
  // Fetch active achievements
  const { data: allAchievements } = await supabase
    .from('achievements')
    .select('id, condition_type, condition_value')
    .eq('is_active', true);

  if (allAchievements) {
    const unlocks = [];

    for (const ach of allAchievements) {
      let met = false;
      switch (ach.condition_type) {
        case 'total_kills':
          met = data.kills >= ach.condition_value;
          break;
        case 'survival_seconds':
          // Start time + duration vs simple duration check.
          // verifiedStartTime is server truth if available.
          const duration =
            (new Date(data.endTime).getTime() -
              (verification.isServerSession
                ? verification.verifiedStartTime
                : data.startTime)) /
            1000;
          met = duration >= ach.condition_value;
          break;
        case 'max_level':
          met = data.level >= ach.condition_value;
          break;
        case 'pnl_percent':
          // Use verified PnL
          met = verification.verifiedPnL >= ach.condition_value;
          break;
      }

      if (met) {
        unlocks.push({
          player_id: playerId,
          achievement_id: ach.id,
          session_id: data.sessionId,
        });
      }
    }

    if (unlocks.length > 0) {
      // Ignore duplicates (handled by UNIQUE constraint or ON CONFLICT)
      await supabase.from('player_achievements').upsert(unlocks, {
        onConflict: 'player_id, achievement_id',
        ignoreDuplicates: true,
      });
    }
  }

  // 3. Wallet updates are handled by Database Trigger (trg_game_reward & trg_achievement_reward)
  // No explicit wallet update needed here.
}

async function rejectSession(
  supabase: any,
  data: GameSessionData,
  status: string,
  errorMessage: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  console.warn(`Session rejected: ${errorMessage}`);

  // Fetch player ID
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('display_name', data.userId)
    .single();

  if (player) {
    // Record rejected session
    await supabase.from('game_sessions').upsert(
      {
        player_id: player.id,
        session_id: data.sessionId,
        is_verified: false,
        verification_error: errorMessage,
        reward_status: 'rejected',
        reward_amount: 0,
        verified_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    );

    // NOTE: Rollback logic for wallet handles locally via trigger or admin action in this new V2 architecture.
    // Since we rely on triggers for CREDITING, there's nothing to rollback if we haven't credited yet.
    // Rejection happens BEFORE verification status = 'verified', so trigger never fires.
    // Safe.
  }

  return new Response(
    JSON.stringify({ verified: false, error: errorMessage, reward: 0 }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Still return 200 to indicate processed rejection
    }
  );
}
