import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as schema from '../../src/db/schema';

describe('authoritative economy migration', () => {
  it('registers persistent escrow, quote, and shard tables', () => {
    const migrationSource = readFileSync('src/db/migrate.ts', 'utf8');

    expect(migrationSource).toContain("name: '015_authoritative_economy'");
    expect(migrationSource).toContain('CREATE TABLE IF NOT EXISTS run_escrows');
    expect(migrationSource).toContain('CREATE TABLE IF NOT EXISTS cash_out_quotes');
    expect(migrationSource).toContain('CREATE TABLE IF NOT EXISTS shard_entries');
    expect(migrationSource).toContain("name: '016_reward_point_ledger'");
    expect(migrationSource).toContain('CREATE TABLE IF NOT EXISTS reward_point_entries');
  });

  it('exposes the same economy tables through the Drizzle schema', () => {
    expect(schema.runEscrows).toBeDefined();
    expect(schema.cashOutQuotes).toBeDefined();
    expect(schema.shardEntries).toBeDefined();
    expect(schema.rewardPointEntries).toBeDefined();
  });

  it('keeps the human-readable schema snapshot aligned', () => {
    const schemaSnapshot = readFileSync('src/db/schema.sql', 'utf8');

    expect(schemaSnapshot).toContain('CREATE TABLE IF NOT EXISTS run_escrows');
    expect(schemaSnapshot).toContain('CREATE TABLE IF NOT EXISTS cash_out_quotes');
    expect(schemaSnapshot).toContain('CREATE TABLE IF NOT EXISTS shard_entries');
    expect(schemaSnapshot).toContain('CREATE TABLE IF NOT EXISTS reward_point_entries');
  });
});
