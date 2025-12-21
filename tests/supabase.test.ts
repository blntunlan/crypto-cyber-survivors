import { describe, it, expect } from 'vitest';
import { supabase } from '../services/supabase';

describe('Supabase Integration', () => {
  it('should insert and confirm a test session', async () => {
    const testSession = {
      player_id: 'TEST-USER',
      session_timestamp: new Date().toISOString(),
      survival_time_ms: 12345,
      end_reason: 'TEST_RUN',
      max_level: 5,
      total_kills: 42,
      metrics: { verification: 'success' },
    };

    // 1. Insert
    const { error: insertError } = await supabase.from('game_sessions').insert(testSession);

    expect(insertError).toBeNull();

    // 2. Verify
    const { data, error: selectError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('player_id', 'TEST-USER')
      .eq('end_reason', 'TEST_RUN')
      .limit(1)
      .single();

    expect(selectError).toBeNull();
    expect(data).toBeDefined();
    expect(data.total_kills).toBe(42);

    // 3. Clean up (Optional, but good practice for tests)
    // RLS might prevent delete for anon, but let's try.
    // await supabase.from('game_sessions').delete().eq('id', data.id);
  });
});
