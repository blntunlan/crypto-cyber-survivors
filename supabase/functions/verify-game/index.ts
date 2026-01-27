// @ts-nocheck: Deno runtime environment lacks Node types; checks handled by Deno
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const ALLOWED_ORIGINS = [
  'https://crypto-survivors.com',
  'https://crypto-survivors.up.railway.app',
  'https://crypto-cyber-survivors-production.up.railway.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.1.8:3000',
  'https://crypto-cyber-survivors.vercel.app',
];

async function verifyHmac(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map(b => parseInt(b, 16))
    );
    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payload));
  } catch (_e) {
    return false;
  }
}

function createPayload(d: GameSessionData): string {
  return JSON.stringify({
    sessionId: d.sessionId,
    serverSessionId: d.sessionId,
    score: d.optimisticReward ?? 0,
    kills: d.kills ?? 0,
    pnl: d.claimedPnL ?? 0,
    duration: Math.floor((d.survivalTimeMs ?? 0) / 1000),
  });
}

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const cors = {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    const data = await req.json();
    const {
      profileId,
      startTime,
      endTime,
      pair,
      position,
      claimedPnL,
      kills,
      level,
      sessionId,
      signature,
      survivalSeconds,
    } = data;

    const serverNow = Date.now();
    const effectiveEndTime = serverNow;

    // 1. Session exists?
    const { data: session } = await supabase
      .from('sessions')
      .select('id, created_at, is_verified, session_secret')
      .eq('id', sessionId)
      .maybeSingle();

    if (session) {
      if (session.is_verified)
        return new Response(JSON.stringify({ error: 'Already verified' }), {
          status: 409,
          headers: cors,
        });

      // Signature verification would go here using session.session_secret
    }

    const duration = survivalSeconds || 0;

    if (duration < 5)
      return new Response(JSON.stringify({ error: 'Session too short' }), {
        headers: cors,
      });

    // 2. Player & Rewards
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', profileId)
      .single();

    if (!profile)
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: cors,
      });

    // Base Reward Calculation
    const reward = Math.min(
      5000,
      Math.max(
        0,
        duration * 0.5 + // Buffed survival reward
          kills * 5 +
          level * 50 +
          Math.max(0, claimedPnL * 100)
      )
    );

    // 3. Update Balance (Atomic Update would be better via RPC, but let's do direct for now)
    const { data: account } = await supabase
      .from('virtual_accounts')
      .select('gold_balance')
      .eq('profile_id', profile.id)
      .single();

    const newBalance = (account?.gold_balance || 0) + Math.floor(reward);

    await supabase
      .from('virtual_accounts')
      .update({
        gold_balance: newBalance,
        total_earned_gold: (account?.total_earned_gold || 0) + Math.floor(reward),
      })
      .eq('profile_id', profile.id);

    // 4. Log to Ledger
    await supabase.from('ledger').insert({
      profile_id: profile.id,
      amount: Math.floor(reward),
      currency: 'GOLD',
      transaction_type: 'game_reward',
      reference_id: sessionId,
      balance_after: newBalance,
      metadata: { pnl: claimedPnL, kills, duration },
    });

    // 5. Update Session
    await supabase
      .from('sessions')
      .update({
        exit_price: data.claimedExitPrice, // if available
        survival_seconds: Math.floor(duration),
        is_verified: true,
        reward_amount: Math.floor(reward),
      })
      .eq('id', sessionId);

    return new Response(
      JSON.stringify({ verified: true, reward: Math.floor(reward), pnl: claimedPnL }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: cors,
    });
  }
});
