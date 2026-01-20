// @ts-nocheck: Deno edge function - TypeScript checks handled by Deno runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Allowed origins for CORS - restrict in production
const ALLOWED_ORIGINS = [
  'https://crypto-survivors.up.railway.app',
  'https://crypto-cyber-survivors-production.up.railway.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://crypto-cyber-survivors.vercel.app', // Added common vercel deploy
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

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, pair, leverage, position } = await req.json();

    // 1. Get Player ID
    const { data: player, error: playerError } = await supabaseClient
      .from('players')
      .select('id')
      .eq('display_name', userId)
      .single();

    if (playerError || !player) {
      return new Response(JSON.stringify({ error: 'Player not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Create Session with Secret
    const startTime = new Date();
    const sessionSecret = crypto.randomUUID(); // Secret for signing events

    const { data: session, error: sessionError } = await supabaseClient
      .from('game_sessions')
      .insert({
        player_id: player.id,
        start_time: startTime.toISOString(),
        session_timestamp: startTime.toISOString(),
        crypto_pair: pair,
        position_chosen: position,
        leverage: leverage,
        is_verified: false,
        session_secret: sessionSecret,
      })
      .select('id, start_time')
      .single();

    if (sessionError) {
      throw sessionError;
    }

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        startTime: session.start_time,
        sessionSecret: sessionSecret, // Return secret ONCE to client
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
