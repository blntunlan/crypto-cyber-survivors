// @ts-nocheck: Deno edge function - TypeScript checks handled by Deno runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Allowed origins for CORS - restrict in production
const ALLOWED_ORIGINS = [
  'https://crypto-survivors.com',
  'https://crypto-survivors.up.railway.app',
  'https://crypto-cyber-survivors-production.up.railway.app',
  'http://localhost:3000',
  'http://localhost:5173', // Vite default dev port
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://192.168.1.8:3000',
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

    // 1. Get Profile ID
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('display_name', userId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: `Profile not found: ${userId}` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Create Session with Secret
    const sessionSecret = crypto.randomUUID();
    const clientSessionId = crypto.randomUUID();

    const { data: session, error: sessionError } = await supabaseClient
      .from('sessions')
      .insert({
        profile_id: profile.id,
        id: clientSessionId, // Using id as the primary key from client request
        crypto_pair: pair,
        position_chosen: position,
        is_verified: false,
        session_secret: sessionSecret,
      })
      .select('id, created_at')
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
