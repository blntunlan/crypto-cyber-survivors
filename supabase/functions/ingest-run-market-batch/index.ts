// @ts-nocheck: Deno runtime environment
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const ALLOWED_ORIGINS = [
  'https://crypto-survivors.com',
  'https://crypto-survivors.up.railway.app',
  'https://crypto-cyber-survivors-production.up.railway.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://crypto-cyber-survivors.vercel.app',
];

const MAX_BATCH_SIZE = 500;

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
};

const asIso = (value: number): string => new Date(value).toISOString();

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value);
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.length > 0;
};

function validatePayload(payload: unknown): {
  runId: string;
  items: Array<{
    runConstants: Record<string, unknown>;
    tick: Record<string, unknown>;
    snapshot: Record<string, unknown>;
  }>;
} {
  if (!isPlainObject(payload)) {
    throw new Error('Invalid payload');
  }

  const runId = payload.runId;
  const items = payload.items;

  if (!isNonEmptyString(runId)) {
    throw new Error('Missing runId');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Missing items');
  }

  if (items.length > MAX_BATCH_SIZE) {
    throw new Error(`Batch too large (max ${MAX_BATCH_SIZE})`);
  }

  const typedItems = items.map((item, index) => {
    if (!isPlainObject(item)) {
      throw new Error(`Invalid item at index ${index}`);
    }
    if (
      !isPlainObject(item.runConstants) ||
      !isPlainObject(item.tick) ||
      !isPlainObject(item.snapshot)
    ) {
      throw new Error(`Invalid item payload at index ${index}`);
    }
    return {
      runConstants: item.runConstants,
      tick: item.tick,
      snapshot: item.snapshot,
    };
  });

  return {
    runId,
    items: typedItems,
  };
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = validatePayload(await req.json());

    const { data: profile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();

    const first = payload.items[0]!;
    const firstRun = first.runConstants;

    if (firstRun.runId !== payload.runId) {
      throw new Error('runId mismatch');
    }

    const lastSeq = payload.items.reduce((max, item) => {
      const seq = item.tick.seq;
      return isFiniteNumber(seq) ? Math.max(max, seq) : max;
    }, 0);

    const runRow = {
      run_id: payload.runId,
      profile_id: profile?.id ?? null,
      pair: String(firstRun.pair ?? 'BTC'),
      position: String(firstRun.position ?? 'LONG'),
      leverage: Number(firstRun.leverage ?? 1),
      entry_price: Number(firstRun.entryPrice ?? 0),
      liquidation_price: Number(firstRun.liquidationPrice ?? 0),
      started_at: asIso(Number(firstRun.startedAt ?? Date.now())),
      last_seq: lastSeq,
      algo_version: String(firstRun.versions?.algoVersion ?? 'unknown'),
      config_version: String(firstRun.versions?.configVersion ?? 'unknown'),
      updated_at: new Date().toISOString(),
    };

    const { error: runError } = await adminClient
      .from('game_runs')
      .upsert(runRow, { onConflict: 'run_id' });
    if (runError) throw runError;

    const tickRows = payload.items.map(item => ({
      run_id: String(item.tick.runId),
      seq: Number(item.tick.seq),
      pair: String(item.tick.pair),
      source: String(item.tick.source),
      source_ts: asIso(Number(item.tick.sourceTs)),
      recv_ts: asIso(Number(item.tick.recvTs)),
      price_q: Number(item.tick.price),
      volume_q: Number(item.tick.volume ?? 0),
      high_q: Number(item.tick.high ?? item.tick.price),
      low_q: Number(item.tick.low ?? item.tick.price),
      prev_hash: String(item.tick.prevHash ?? ''),
      hash: String(item.tick.hash ?? ''),
    }));

    const { error: tickError } = await adminClient
      .from('run_ticks')
      .upsert(tickRows, { onConflict: 'run_id,seq' });
    if (tickError) throw tickError;

    const snapshotRows = payload.items.map(item => ({
      run_id: String(item.snapshot.runId),
      seq: Number(item.snapshot.seq),
      pair: String(item.snapshot.pair),
      created_at: asIso(Number(item.snapshot.createdAt)),
      price_q: Number(item.snapshot.price),
      volume_q: Number(item.snapshot.volume ?? 0),
      raw_pnl: Number(item.snapshot.rawPnl),
      effective_pnl: Number(item.snapshot.effectivePnl),
      raw_pnl_bp: Number(item.snapshot.rawPnlBp),
      effective_pnl_bp: Number(item.snapshot.effectivePnlBp),
      leverage: Number(item.snapshot.leverage),
      position: String(item.snapshot.position),
      entry_price: Number(item.snapshot.entryPrice),
      liquidation_price: Number(item.snapshot.liquidationPrice),
      is_liquidated: Boolean(item.snapshot.isLiquidated),
      rsi: Number(item.snapshot.rsi),
      atr_percent: Number(item.snapshot.atrPercent ?? 0),
      atr_bp: Number(item.snapshot.atrBp ?? 0),
      macd: Number(item.snapshot.macd ?? 0),
      difficulty: Number(item.snapshot.difficulty),
      spawn_rate_multiplier: Number(item.snapshot.spawnRateMultiplier ?? 1),
      enemy_damage: Number(item.snapshot.enemyDamage ?? 1),
      enemy_speed: Number(item.snapshot.enemySpeed ?? 1),
      gem_value_multiplier: Number(item.snapshot.gemValueMultiplier ?? 1),
      momentum: Number(item.snapshot.momentum ?? 0),
      tick_hash: String(item.snapshot.tickHash ?? ''),
      checksum: String(item.snapshot.checksum ?? ''),
      algo_version: String(item.snapshot.algoVersion ?? 'unknown'),
      config_version: String(item.snapshot.configVersion ?? 'unknown'),
    }));

    const { error: snapshotError } = await adminClient
      .from('run_snapshots')
      .upsert(snapshotRows, { onConflict: 'run_id,seq' });
    if (snapshotError) throw snapshotError;

    return new Response(
      JSON.stringify({
        ok: true,
        runId: payload.runId,
        ingested: payload.items.length,
        lastSeq,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
