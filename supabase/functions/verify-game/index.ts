import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SOFT VERIFICATION - MVP tolerances (will tighten later)
const TOLERANCE = {
  PRICE: 0.02, // %2 - Allow for timing differences
  PNL: 0.05, // %5 - Allow for calculation differences
  TIME: 60000, // 60 seconds - Account for clock drift
  MAX_PNL: 1.0, // %100 - Reject obviously fake PnL (>100% in short session)
};

serve(async req => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
    } = await req.json();

    // Basic sanity checks
    const sessionDuration = (endTime - startTime) / 1000; // seconds

    if (sessionDuration < 5) {
      return new Response(JSON.stringify({ error: 'Session too short', verified: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Maximum PnL check (prevent obviously fake sessions)
    if (Math.abs(claimedPnL) > TOLERANCE.MAX_PNL * 100) {
      return new Response(
        JSON.stringify({ error: 'PnL exceeds maximum threshold', verified: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch price logs from database (using inline ISO conversion)

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
    let verificationMethod = 'trusted'; // Default: trust client if no server data

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
        position === 'long'
          ? (verifiedExitPrice - verifiedEntryPrice) / verifiedEntryPrice
          : (verifiedEntryPrice - verifiedExitPrice) / verifiedEntryPrice;

      verifiedPnL = priceChange * leverage * 100; // Percentage

      // Calculate diffs for analytics
      priceDiffEntry = Math.abs(claimedEntryPrice - verifiedEntryPrice) / verifiedEntryPrice;
      priceDiffExit = Math.abs(claimedExitPrice - verifiedExitPrice) / verifiedExitPrice;
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

    // Calculate reward based on verified data
    const BASE_REWARD = 10;
    const KILL_BONUS = kills * 2;
    const LEVEL_BONUS = level * 5;
    const SURVIVAL_BONUS = Math.floor(sessionDuration / 60) * 3;

    let reward = BASE_REWARD + KILL_BONUS + LEVEL_BONUS + SURVIVAL_BONUS;

    // PnL multiplier (capped)
    if (verifiedPnL > 0) {
      reward += Math.min(verifiedPnL * 10, LEVEL_BONUS * 0.5);
    } else {
      // Small penalty for losses
      reward = Math.max(reward - Math.abs(verifiedPnL), LEVEL_BONUS * 0.1);
    }
    reward = Math.min(reward, 5000);

    // Persist Session with optimization data
    const { error: insertError } = await supabaseClient.from('game_sessions').insert({
      user_id: userId,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      survival_seconds: Math.floor(sessionDuration),
      pair,
      position,
      leverage,
      claimed_entry_price: claimedEntryPrice,
      claimed_exit_price: claimedExitPrice,
      claimed_pnl: claimedPnL,
      verified_entry_price: verifiedEntryPrice,
      verified_exit_price: verifiedExitPrice,
      verified_pnl: verifiedPnL,
      is_verified: true,
      verification_error: verificationMethod !== 'verified' ? verificationMethod : null,
      kills,
      level,
      gold_collected: goldCollected,
      reward_amount: reward,
      // Optimization data
      price_diff_entry: priceDiffEntry,
      price_diff_exit: priceDiffExit,
      pnl_diff: pnlDiffValue,
      time_diff_ms: timeDiffMs,
      verification_method: verificationMethod,
    });

    if (insertError) {
      console.error('Insert error:', insertError);
      // Don't fail the whole request - verification still succeeded
    }

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
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
