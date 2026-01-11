/**
 * Integration Tests - Railway → Supabase
 *
 * Bu testler Railway market-server'ın Supabase ile doğru iletişim kurduğunu doğrular.
 *
 * Çalıştırmak için:
 *   npm run test:integration
 *
 * Gereksinimler:
 *   - SUPABASE_URL env variable
 *   - SUPABASE_SERVICE_ROLE_KEY env variable
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Test configuration
const TEST_CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL ?? '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  TEST_PAIR: 'BTCUSDT',
  CLEANUP_AFTER_TEST: true,
};

// Test utilities
const log = {
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  success: (msg: string) => console.log(`✅ ${msg}`),
  error: (msg: string) => console.error(`❌ ${msg}`),
  test: (name: string) => console.log(`\n🧪 TEST: ${name}`),
};

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

class IntegrationTester {
  private client: SupabaseClient;
  private results: TestResult[] = [];
  private testIds: number[] = []; // For cleanup

  constructor() {
    if (!TEST_CONFIG.SUPABASE_URL || !TEST_CONFIG.SUPABASE_SERVICE_ROLE_KEY) {
      this.client = null as any;
      return;
    }

    this.client = createClient(
      TEST_CONFIG.SUPABASE_URL,
      TEST_CONFIG.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    log.test(name);
    const start = Date.now();

    try {
      await testFn();
      const duration = Date.now() - start;
      this.results.push({ name, passed: true, duration });
      log.success(`${name} passed (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - start;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.results.push({ name, passed: false, duration, error: errorMsg });
      log.error(`${name} failed: ${errorMsg}`);
    }
  }

  // ============================================
  // TEST 1: Can connect to Supabase
  // ============================================
  async testConnection(): Promise<void> {
    await this.runTest('Connection to Supabase', async () => {
      const { data, error } = await this.client
        .from('price_logs')
        .select('id')
        .limit(1);

      if (error) throw new Error(`Connection failed: ${error.message}`);
      log.info(`Connected successfully. Sample data: ${data.length} rows`);
    });
  }

  // ============================================
  // TEST 2: Can write to price_logs (RLS bypass)
  // ============================================
  async testWritePriceLogs(): Promise<void> {
    await this.runTest('Write to price_logs (Service Role)', async () => {
      const testData = {
        pair: TEST_CONFIG.TEST_PAIR,
        price: 99999.99,
        high: 100000.0,
        low: 99000.0,
        volume: 1234.56,
        timestamp: new Date().toISOString(),
        source: 'integration_test',
      };

      const { data, error } = await this.client
        .from('price_logs')
        .insert(testData)
        .select('id')
        .single();

      if (error) throw new Error(`Insert failed: ${error.message}`);
      if (!data.id) throw new Error('No ID returned after insert');

      this.testIds.push(data.id);
      log.info(`Inserted price_log with ID: ${data.id}`);
    });
  }

  // ============================================
  // TEST 3: Can read back inserted data
  // ============================================
  async testReadPriceLogs(): Promise<void> {
    await this.runTest('Read price_logs', async () => {
      if (this.testIds.length === 0) {
        throw new Error('No test data to read (write test may have failed)');
      }

      const { data, error } = await this.client
        .from('price_logs')
        .select('*')
        .eq('id', this.testIds[0])
        .single();

      if (error) throw new Error(`Read failed: ${error.message}`);
      if (!data) throw new Error('No data returned');
      if (data.source !== 'integration_test') throw new Error('Data mismatch');

      log.info(`Read back: ${data.pair} @ ${data.price}`);
    });
  }

  // ============================================
  // TEST 4: Can delete test data
  // ============================================
  async testDeletePriceLogs(): Promise<void> {
    await this.runTest('Delete price_logs', async () => {
      if (this.testIds.length === 0) {
        log.info('No test data to delete');
        return;
      }

      const { error } = await this.client
        .from('price_logs')
        .delete()
        .in('id', this.testIds);

      if (error) throw new Error(`Delete failed: ${error.message}`);
      log.info(`Deleted ${this.testIds.length} test records`);
      this.testIds = [];
    });
  }

  // ============================================
  // TEST 5: RLS is enforced for anon key
  // ============================================
  async testRLSEnforced(): Promise<void> {
    await this.runTest('RLS enforcement check', async () => {
      // Create anon client
      const anonKey = process.env.SUPABASE_ANON_KEY;

      if (!anonKey) {
        log.info('SUPABASE_ANON_KEY not set, skipping RLS test');
        return;
      }

      const anonClient = createClient(TEST_CONFIG.SUPABASE_URL, anonKey);

      // Try to insert with anon key (should fail if RLS is enabled)
      const { error } = await anonClient.from('price_logs').insert({
        pair: 'TESTUSDT',
        price: 1.0,
        timestamp: new Date().toISOString(),
        source: 'rls_test',
      });

      // RLS should block inserts from anon users
      if (!error) {
        throw new Error('RLS not enforced - anon user was able to insert!');
      }

      log.info(`RLS correctly blocked insert: ${error.message}`);
    });
  }

  // ============================================
  // TEST 6: Batch insert performance
  // ============================================
  async testBatchInsert(): Promise<void> {
    await this.runTest('Batch insert performance', async () => {
      const batchSize = 100;
      const testData = Array.from({ length: batchSize }, (_, i) => ({
        pair: TEST_CONFIG.TEST_PAIR,
        price: 98000 + Math.random() * 2000,
        high: 100000,
        low: 96000,
        volume: Math.random() * 1000,
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        source: 'batch_test',
      }));

      const start = Date.now();
      const { data, error } = await this.client
        .from('price_logs')
        .insert(testData)
        .select('id');

      const duration = Date.now() - start;

      if (error) throw new Error(`Batch insert failed: ${error.message}`);

      const insertedIds = data.map(d => d.id);
      this.testIds.push(...insertedIds);

      const rate = (batchSize / (duration / 1000)).toFixed(2);
      log.info(`Inserted ${batchSize} records in ${duration}ms (${rate} records/sec)`);
    });
  }

  // ============================================
  // TEST 7: Query performance
  // ============================================
  async testQueryPerformance(): Promise<void> {
    await this.runTest('Query performance', async () => {
      const queries = [
        {
          name: 'Last 100 records',
          fn: () =>
            this.client
              .from('price_logs')
              .select('*')
              .order('timestamp', { ascending: false })
              .limit(100),
        },
        {
          name: 'By pair',
          fn: () =>
            this.client.from('price_logs').select('*').eq('pair', 'BTCUSDT').limit(50),
        },
        {
          name: 'Count',
          fn: () =>
            this.client.from('price_logs').select('*', { count: 'exact', head: true }),
        },
      ];

      for (const q of queries) {
        const start = Date.now();
        const { error } = await q.fn();
        const duration = Date.now() - start;

        if (error) {
          log.error(`Query "${q.name}" failed: ${error.message}`);
        } else {
          log.info(`Query "${q.name}": ${duration}ms`);
        }
      }
    });
  }

  // ============================================
  // Cleanup
  // ============================================
  async cleanup(): Promise<void> {
    if (!TEST_CONFIG.CLEANUP_AFTER_TEST) {
      log.info('Cleanup disabled, skipping...');
      return;
    }

    if (this.testIds.length > 0) {
      log.info(`Cleaning up ${this.testIds.length} test records...`);
      await this.client.from('price_logs').delete().in('id', this.testIds);
    }

    // Also cleanup batch_test and integration_test sources
    await this.client
      .from('price_logs')
      .delete()
      .in('source', ['integration_test', 'batch_test', 'rls_test']);

    log.success('Cleanup complete');
  }

  // ============================================
  // Run all tests
  // ============================================
  async runAll(): Promise<void> {
    if (!TEST_CONFIG.SUPABASE_URL || !TEST_CONFIG.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('\n⚠️ SKIPPING INTEGRATION TESTS: Missing Supabase credentials');
      console.log(
        'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to run these tests.\n'
      );
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('🚀 Railway → Supabase Integration Tests');
    console.log('='.repeat(60));
    console.log(`Supabase URL: ${TEST_CONFIG.SUPABASE_URL}`);
    console.log(`Test Pair: ${TEST_CONFIG.TEST_PAIR}`);
    console.log('='.repeat(60));

    try {
      await this.testConnection();
      await this.testWritePriceLogs();
      await this.testReadPriceLogs();
      await this.testBatchInsert();
      await this.testQueryPerformance();
      await this.testRLSEnforced();
      await this.testDeletePriceLogs();
    } finally {
      await this.cleanup();
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

    this.results.forEach(r => {
      const icon = r.passed ? '✅' : '❌';
      console.log(
        `${icon} ${r.name}: ${r.duration}ms ${r.error ? `(${r.error})` : ''}`
      );
    });

    console.log('='.repeat(60));
    console.log(`Total: ${passed} passed, ${failed} failed (${totalTime}ms)`);
    console.log('='.repeat(60) + '\n');

    if (failed > 0) {
      process.exit(1);
    }
  }
}

// Run tests
if (typeof describe !== 'undefined') {
  describe('Railway → Supabase Integration', () => {
    it('should pass integration tests', async () => {
      const tester = new IntegrationTester();
      await tester.runAll();
    }, 30000); // 30s timeout
  });
} else {
  // Manual execution via ts-node
  const tester = new IntegrationTester();
  tester.runAll().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
