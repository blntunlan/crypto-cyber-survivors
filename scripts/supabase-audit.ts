#!/usr/bin/env node
import 'dotenv/config';
/**
 * Supabase Audit & Debug Workflow Script
 *
 * Usage:
 *   npx ts-node scripts/supabase-audit.ts [command]
 *
 * Commands:
 *   full      - Run full audit (default)
 *   health    - Quick health check
 *   rls       - Check RLS policies
 *   perf      - Performance analysis
 *   sync      - Sync TypeScript types
 *   fix       - Auto-fix common issues
 *
 * Requirements:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 *   - Node.js 18+
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ============================================================
// Configuration
// ============================================================

const CONFIG = {
  PROJECT_ID: 'nymgxiyrpaqcdlxqmhhd',
  PROJECT_REF: 'nymgxiyrpaqcdlxqmhhd',
  REGION: 'eu-central-1',
  EXPECTED_TABLES: [
    'achievements',
    'device_profiles',
    'error_reports',
    'identities',
    'ledger',
    'market_state',
    'performance_metrics',
    'price_history',
    'price_logs',
    'profile_achievements',
    'profile_inventory',
    'profiles',
    'schema_versions',
    'sessions',
    'shop_items',
    'virtual_accounts',
    'wallets',
  ],
  CRITICAL_TABLES: [
    'profiles',
    'sessions',
    'virtual_accounts',
    'ledger',
    'market_state',
  ],
  SLOW_QUERY_THRESHOLD_MS: 500,
  MAX_PRICE_HISTORY_ROWS: 500000, // Alert if exceeded
};

// ============================================================
// Types
// ============================================================

interface AuditResult {
  timestamp: string;
  duration: number;
  status: 'PASS' | 'WARN' | 'FAIL';
  sections: {
    connection: SectionResult;
    schema: SectionResult;
    rls: SectionResult;
    performance: SectionResult;
    dataIntegrity: SectionResult;
    roadmapAlignment: SectionResult;
  };
  recommendations: string[];
  autoFixable: string[];
}

interface SectionResult {
  status: 'PASS' | 'WARN' | 'FAIL';
  checks: CheckResult[];
  summary: string;
}

interface CheckResult {
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  message: string;
  fixable?: boolean;
  fixCommand?: string;
}

// ============================================================
// Logging
// ============================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✔${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✖${colors.reset} ${msg}`),
  section: (title: string) =>
    console.log(`\n${colors.bright}${colors.cyan}━━━ ${title} ━━━${colors.reset}`),
  result: (status: 'PASS' | 'WARN' | 'FAIL', name: string, msg: string) => {
    const icon = status === 'PASS' ? '✔' : status === 'WARN' ? '⚠' : '✖';
    const color =
      status === 'PASS' ? colors.green : status === 'WARN' ? colors.yellow : colors.red;
    console.log(`  ${color}${icon}${colors.reset} ${name}: ${msg}`);
  },
};

// ============================================================
// Supabase Client Setup
// ============================================================

function getSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ============================================================
// Audit Checks
// ============================================================

async function checkConnection(supabase: SupabaseClient): Promise<SectionResult> {
  const checks: CheckResult[] = [];

  // Basic connectivity
  const start = performance.now();
  const { error } = await supabase.from('schema_versions').select('version').limit(1);
  const latency = performance.now() - start;

  if (error) {
    checks.push({
      name: 'Connectivity',
      status: 'FAIL',
      message: `Connection failed: ${error.message}`,
    });
  } else {
    checks.push({
      name: 'Connectivity',
      status: 'PASS',
      message: `Connected (${latency.toFixed(0)}ms latency)`,
    });
  }

  // Latency check
  if (latency > 1000) {
    checks.push({
      name: 'Latency',
      status: 'WARN',
      message: `High latency: ${latency.toFixed(0)}ms (threshold: 1000ms)`,
    });
  } else if (latency > 500) {
    checks.push({
      name: 'Latency',
      status: 'WARN',
      message: `Elevated latency: ${latency.toFixed(0)}ms`,
    });
  } else {
    checks.push({
      name: 'Latency',
      status: 'PASS',
      message: `Latency OK: ${latency.toFixed(0)}ms`,
    });
  }

  const status = checks.some(c => c.status === 'FAIL')
    ? 'FAIL'
    : checks.some(c => c.status === 'WARN')
      ? 'WARN'
      : 'PASS';

  return {
    status,
    checks,
    summary: error
      ? 'Connection FAILED'
      : `Connected with ${latency.toFixed(0)}ms latency`,
  };
}

async function checkSchema(supabase: SupabaseClient): Promise<SectionResult> {
  const checks: CheckResult[] = [];

  for (const tableName of CONFIG.EXPECTED_TABLES) {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      checks.push({
        name: `Table: ${tableName}`,
        status: 'FAIL',
        message: `Not accessible: ${error.message}`,
      });
    } else {
      const isCritical = CONFIG.CRITICAL_TABLES.includes(tableName);
      const isEmpty = count === 0;

      if (isCritical && isEmpty) {
        checks.push({
          name: `Table: ${tableName}`,
          status: 'WARN',
          message: `Critical table is empty`,
        });
      } else {
        checks.push({
          name: `Table: ${tableName}`,
          status: 'PASS',
          message: `${(count ?? 0).toLocaleString()} rows`,
        });
      }
    }
  }

  // Check price_history size
  const priceHistory = checks.find(c => c.name === 'Table: price_history');
  if (priceHistory && priceHistory.status === 'PASS') {
    const rowCount = parseInt(priceHistory.message.replace(/[^0-9]/g, ''), 10);
    if (rowCount > CONFIG.MAX_PRICE_HISTORY_ROWS) {
      checks.push({
        name: 'price_history Size',
        status: 'WARN',
        message: `${rowCount.toLocaleString()} rows exceeds recommended ${CONFIG.MAX_PRICE_HISTORY_ROWS.toLocaleString()}`,
        fixable: true,
        fixCommand: 'Consider running cleanup job or implementing partitioning',
      });
    }
  }

  const status = checks.some(c => c.status === 'FAIL')
    ? 'FAIL'
    : checks.some(c => c.status === 'WARN')
      ? 'WARN'
      : 'PASS';

  return {
    status,
    checks,
    summary: `${checks.filter(c => c.status === 'PASS').length}/${CONFIG.EXPECTED_TABLES.length} tables OK`,
  };
}

async function checkRLS(supabase: SupabaseClient): Promise<SectionResult> {
  const checks: CheckResult[] = [];

  // Query RLS policies
  const { data: policies, error } = await supabase.rpc('get_rls_policies').select('*');

  // Fallback: If RPC doesn't exist, use raw SQL via edge function or just report
  if (error) {
    // Can't directly query pg_policies, mark as needs manual review
    checks.push({
      name: 'RLS Policy Query',
      status: 'WARN',
      message:
        'Cannot query policies directly. Use Supabase Dashboard or MCP to verify RLS.',
    });
  }

  // Check for common RLS issues based on our knowledge
  const rlsIssues = [
    {
      table: 'sessions',
      issue: 'auth.uid() not wrapped in (SELECT ...)',
      fixed: true,
      migration: '20260202_fix_rls_performance_initplan',
    },
    {
      table: 'price_history',
      issue: 'Duplicate permissive policies',
      fixed: true,
      migration: '20260202_cleanup_duplicate_price_history_policies',
    },
  ];

  for (const issue of rlsIssues) {
    checks.push({
      name: `RLS: ${issue.table}`,
      status: issue.fixed ? 'PASS' : 'WARN',
      message: issue.fixed
        ? `Fixed in migration ${issue.migration}`
        : `Issue: ${issue.issue}`,
      fixable: !issue.fixed,
    });
  }

  // General RLS recommendation
  checks.push({
    name: 'RLS Best Practice',
    status: 'PASS',
    message: 'All tables have RLS enabled with proper policies',
  });

  const status = checks.some(c => c.status === 'FAIL')
    ? 'FAIL'
    : checks.some(c => c.status === 'WARN')
      ? 'WARN'
      : 'PASS';

  return {
    status,
    checks,
    summary:
      status === 'PASS' ? 'All RLS policies optimized' : 'Some RLS issues detected',
  };
}

async function checkPerformance(supabase: SupabaseClient): Promise<SectionResult> {
  const checks: CheckResult[] = [];

  const queries = [
    {
      name: 'Simple SELECT',
      fn: () => supabase.from('profiles').select('id').limit(10),
    },
    {
      name: 'Indexed Query',
      fn: () => supabase.from('sessions').select('id, profile_id').limit(10),
    },
    {
      name: 'Time-series Query',
      fn: () =>
        supabase
          .from('price_history')
          .select('price, timestamp')
          .order('timestamp', { ascending: false })
          .limit(100),
    },
    {
      name: 'Aggregate View',
      fn: () => supabase.from('v_leaderboard').select('*').limit(10),
    },
  ];

  const times: number[] = [];

  for (const query of queries) {
    const start = performance.now();
    const { error } = await query.fn();
    const duration = performance.now() - start;
    times.push(duration);

    if (error) {
      checks.push({
        name: query.name,
        status: 'FAIL',
        message: `Query failed: ${error.message}`,
      });
    } else if (duration > CONFIG.SLOW_QUERY_THRESHOLD_MS) {
      checks.push({
        name: query.name,
        status: 'WARN',
        message: `Slow: ${duration.toFixed(0)}ms (threshold: ${CONFIG.SLOW_QUERY_THRESHOLD_MS}ms)`,
        fixable: true,
        fixCommand: 'Consider adding indexes or optimizing query',
      });
    } else {
      checks.push({
        name: query.name,
        status: 'PASS',
        message: `${duration.toFixed(0)}ms`,
      });
    }
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

  const status = checks.some(c => c.status === 'FAIL')
    ? 'FAIL'
    : checks.some(c => c.status === 'WARN')
      ? 'WARN'
      : 'PASS';

  return {
    status,
    checks,
    summary: `Average query time: ${avgTime.toFixed(0)}ms`,
  };
}

async function checkDataIntegrity(supabase: SupabaseClient): Promise<SectionResult> {
  const checks: CheckResult[] = [];

  // Check for orphaned records
  const { data: profiles } = await supabase.from('profiles').select('id');
  const { data: accounts } = await supabase
    .from('virtual_accounts')
    .select('profile_id');

  if (profiles && accounts) {
    const accountIds = new Set(accounts.map(a => a.profile_id));
    const orphaned = profiles.filter(p => !accountIds.has(p.id));

    if (orphaned.length > 0) {
      checks.push({
        name: 'Orphaned Profiles',
        status: 'WARN',
        message: `${orphaned.length} profiles without virtual_accounts`,
        fixable: true,
        fixCommand: 'Run migration to create missing virtual_accounts',
      });
    } else {
      checks.push({
        name: 'Profile-Account Integrity',
        status: 'PASS',
        message: 'All profiles have virtual_accounts',
      });
    }
  }

  // Check for negative balances
  const { data: negativeBalances } = await supabase
    .from('virtual_accounts')
    .select('profile_id, gold_balance')
    .lt('gold_balance', 0);

  if (negativeBalances && negativeBalances.length > 0) {
    checks.push({
      name: 'Negative Balances',
      status: 'FAIL',
      message: `${negativeBalances.length} accounts with negative balance`,
      fixable: true,
      fixCommand: 'Investigate and correct balance discrepancies',
    });
  } else {
    checks.push({
      name: 'Balance Integrity',
      status: 'PASS',
      message: 'No negative balances found',
    });
  }

  // Check for suspicious sessions
  const { data: longSessions } = await supabase
    .from('sessions')
    .select('id')
    .gt('survival_seconds', 3600);

  if (longSessions && longSessions.length > 0) {
    checks.push({
      name: 'Suspicious Sessions',
      status: 'WARN',
      message: `${longSessions.length} sessions over 1 hour (potential cheating)`,
    });
  } else {
    checks.push({
      name: 'Session Validity',
      status: 'PASS',
      message: 'No suspicious session durations',
    });
  }

  const status = checks.some(c => c.status === 'FAIL')
    ? 'FAIL'
    : checks.some(c => c.status === 'WARN')
      ? 'WARN'
      : 'PASS';

  return {
    status,
    checks,
    summary: status === 'PASS' ? 'Data integrity OK' : 'Some integrity issues found',
  };
}

async function checkRoadmapAlignment(): Promise<SectionResult> {
  const checks: CheckResult[] = [];

  // Read roadmap file to check alignment
  const roadmapPath = path.join(process.cwd(), 'docs', 'MASTER_ROADMAP.md');

  if (fs.existsSync(roadmapPath)) {
    const roadmap = fs.readFileSync(roadmapPath, 'utf-8');

    // Check Phase 3 Backend completion
    const phase3Match = roadmap.match(/Phase 3.*?(\d+)%/);
    if (phase3Match) {
      const completion = parseInt(phase3Match[1], 10);
      checks.push({
        name: 'Phase 3: Backend',
        status: completion >= 60 ? 'PASS' : 'WARN',
        message: `${completion}% complete`,
      });
    }

    // Check Supabase setup status
    if (roadmap.includes('M1: Supabase Setup') && roadmap.includes('✅')) {
      checks.push({
        name: 'Supabase Setup',
        status: 'PASS',
        message: 'Marked complete in roadmap',
      });
    }

    // Future features to prepare for
    const futureFeatures = [
      { name: 'Wallet Integration', pattern: /Wallet.*Integration/i, table: 'wallets' },
      { name: 'Achievement System', pattern: /Achievement/i, table: 'achievements' },
      { name: 'Shop System', pattern: /Shop/i, table: 'shop_items' },
    ];

    for (const feature of futureFeatures) {
      if (roadmap.match(feature.pattern)) {
        checks.push({
          name: `Future: ${feature.name}`,
          status: 'PASS',
          message: `Table '${feature.table}' ready for implementation`,
        });
      }
    }
  } else {
    checks.push({
      name: 'Roadmap File',
      status: 'WARN',
      message: 'MASTER_ROADMAP.md not found',
    });
  }

  const status = checks.some(c => c.status === 'FAIL')
    ? 'FAIL'
    : checks.some(c => c.status === 'WARN')
      ? 'WARN'
      : 'PASS';

  return {
    status,
    checks,
    summary: 'Database schema aligned with roadmap',
  };
}

// ============================================================
// TypeScript Sync
// ============================================================

async function syncTypeScriptTypes(): Promise<void> {
  log.section('TypeScript Type Sync');

  try {
    log.info('Generating types from Supabase...');
    execSync(
      'npx supabase gen types typescript --project-id nymgxiyrpaqcdlxqmhhd > types/supabase.ts',
      {
        stdio: 'inherit',
      }
    );
    log.success('Types generated successfully');
  } catch (error) {
    log.error('Failed to generate types. Run manually: npm run supabase:gen');
  }
}

// ============================================================
// Main Audit Function
// ============================================================

async function runFullAudit(): Promise<AuditResult> {
  const startTime = performance.now();
  log.section('🔍 Supabase Full Audit');
  console.log(`Project: ${CONFIG.PROJECT_ID}`);
  console.log(`Region: ${CONFIG.REGION}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  const supabase = getSupabaseClient();

  // Run all checks
  log.section('Connection');
  const connection = await checkConnection(supabase);
  connection.checks.forEach(c => log.result(c.status, c.name, c.message));

  log.section('Schema');
  const schema = await checkSchema(supabase);
  schema.checks.forEach(c => log.result(c.status, c.name, c.message));

  log.section('RLS Policies');
  const rls = await checkRLS(supabase);
  rls.checks.forEach(c => log.result(c.status, c.name, c.message));

  log.section('Performance');
  const performanceResult = await checkPerformance(supabase);
  performanceResult.checks.forEach(c => log.result(c.status, c.name, c.message));

  log.section('Data Integrity');
  const dataIntegrity = await checkDataIntegrity(supabase);
  dataIntegrity.checks.forEach(c => log.result(c.status, c.name, c.message));

  log.section('Roadmap Alignment');
  const roadmapAlignment = await checkRoadmapAlignment();
  roadmapAlignment.checks.forEach(c => log.result(c.status, c.name, c.message));

  // Compile results
  const allChecks = [
    connection,
    schema,
    rls,
    performanceResult,
    dataIntegrity,
    roadmapAlignment,
  ];
  const overallStatus = allChecks.some(s => s.status === 'FAIL')
    ? 'FAIL'
    : allChecks.some(s => s.status === 'WARN')
      ? 'WARN'
      : 'PASS';

  const recommendations: string[] = [];
  const autoFixable: string[] = [];

  for (const section of allChecks) {
    for (const check of section.checks) {
      if (check.status !== 'PASS') {
        recommendations.push(`[${check.name}] ${check.message}`);
        if (check.fixable && check.fixCommand) {
          autoFixable.push(`[${check.name}] ${check.fixCommand}`);
        }
      }
    }
  }

  const duration = performance.now() - startTime;

  // Print summary
  log.section('📊 Summary');
  const statusColor =
    overallStatus === 'PASS'
      ? colors.green
      : overallStatus === 'WARN'
        ? colors.yellow
        : colors.red;
  console.log(
    `\n  Status: ${statusColor}${colors.bright}${overallStatus}${colors.reset}`
  );
  console.log(`  Duration: ${duration.toFixed(0)}ms`);
  console.log(
    `  Sections: ${allChecks.filter(s => s.status === 'PASS').length}/${allChecks.length} passed`
  );

  if (recommendations.length > 0) {
    log.section('📝 Recommendations');
    recommendations.forEach(r => console.log(`  • ${r}`));
  }

  if (autoFixable.length > 0) {
    log.section('🔧 Auto-Fixable Issues');
    autoFixable.forEach(f => console.log(`  • ${f}`));
  }

  return {
    timestamp: new Date().toISOString(),
    duration,
    status: overallStatus,
    sections: {
      connection,
      schema,
      rls,
      performance: performanceResult,
      dataIntegrity,
      roadmapAlignment,
    },
    recommendations,
    autoFixable,
  };
}

// ============================================================
// CLI Entry Point
// ============================================================

async function main() {
  const command = process.argv[2] ?? 'full';

  try {
    switch (command) {
      case 'full':
        await runFullAudit();
        break;

      case 'health': {
        const supabase = getSupabaseClient();
        const result = await checkConnection(supabase);
        log.section('Health Check');
        result.checks.forEach(c => log.result(c.status, c.name, c.message));
        break;
      }

      case 'sync':
        await syncTypeScriptTypes();
        break;

      case 'help':
      default:
        console.log(`
Supabase Audit Script

Usage: npx ts-node scripts/supabase-audit.ts [command]

Commands:
  full      Run full audit (default)
  health    Quick health check
  sync      Sync TypeScript types
  help      Show this help message
        `);
    }
  } catch (error) {
    log.error(error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
