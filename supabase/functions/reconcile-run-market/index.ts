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

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

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

    const payload = await req.json();
    if (!isObject(payload)) {
      throw new Error('Invalid payload');
    }

    const runId = payload.runId;
    const items = payload.items;

    if (typeof runId !== 'string' || runId.length === 0) {
      throw new Error('Missing runId');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Missing items');
    }

    const seqList = items
      .map(item => (isObject(item) ? Number(item.seq) : NaN))
      .filter(seq => Number.isInteger(seq) && seq > 0);
    if (seqList.length === 0) {
      throw new Error('No valid seq values');
    }

    const { data: runRow, error: runError } = await adminClient
      .from('game_runs')
      .select('run_id, profile_id')
      .eq('run_id', runId)
      .maybeSingle();
    if (runError) throw runError;
    if (!runRow) {
      return new Response(JSON.stringify({ error: 'Run not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();

    if (runRow.profile_id && profile?.id !== runRow.profile_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: snapshots, error: snapshotError } = await adminClient
      .from('run_snapshots')
      .select('seq, checksum, raw_pnl_bp, effective_pnl_bp, difficulty')
      .eq('run_id', runId)
      .in('seq', seqList);
    if (snapshotError) throw snapshotError;

    const snapshotMap = new Map<number, Record<string, unknown>>();
    for (const snapshot of snapshots ?? []) {
      snapshotMap.set(Number(snapshot.seq), snapshot);
    }

    const reconcileRows = items
      .map(item => {
        if (!isObject(item)) return null;
        const seq = Number(item.seq);
        const clientChecksum = String(item.clientChecksum ?? '');
        const snapshot = snapshotMap.get(seq);

        if (!Number.isInteger(seq) || seq <= 0 || clientChecksum.length === 0) {
          return null;
        }

        if (!snapshot) {
          return {
            run_id: runId,
            seq,
            client_checksum: clientChecksum,
            server_checksum: null,
            status: 'error',
            details: { reason: 'snapshot_not_found' },
            updated_at: new Date().toISOString(),
          };
        }

        const serverChecksum = String(snapshot.checksum ?? '');
        const status = serverChecksum === clientChecksum ? 'ok' : 'mismatch';

        return {
          run_id: runId,
          seq,
          client_checksum: clientChecksum,
          server_checksum: serverChecksum,
          drift_raw_pnl_bp: 0,
          drift_effective_pnl_bp: 0,
          drift_difficulty_bp: 0,
          status,
          details: {
            serverRawPnlBp: snapshot.raw_pnl_bp,
            serverEffectivePnlBp: snapshot.effective_pnl_bp,
            serverDifficulty: snapshot.difficulty,
          },
          updated_at: new Date().toISOString(),
        };
      })
      .filter(Boolean);

    if (reconcileRows.length === 0) {
      throw new Error('No valid reconcile rows');
    }

    const { error: reconcileError } = await adminClient
      .from('run_reconcile')
      .upsert(reconcileRows, { onConflict: 'run_id,seq' });
    if (reconcileError) throw reconcileError;

    const summary = reconcileRows.reduce(
      (acc, row) => {
        if (row.status === 'ok') acc.ok++;
        else if (row.status === 'mismatch') acc.mismatch++;
        else acc.error++;
        return acc;
      },
      { ok: 0, mismatch: 0, error: 0 }
    );

    return new Response(
      JSON.stringify({
        ok: true,
        runId,
        processed: reconcileRows.length,
        summary,
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
