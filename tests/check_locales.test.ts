import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('sync_locales script', () => {
  it('contains locale key comparison workflow', () => {
    const file = readFileSync(join(process.cwd(), 'scripts/sync_locales.cjs'), 'utf8');
    expect(file).toContain('function sync');
    expect(file).toContain("const langs = ['es', 'hi', 'pt', 'ru', 'tr', 'vi', 'zh']");
    expect(file).toContain('Added:');
  });
});
