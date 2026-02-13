import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('server.js hardening script', () => {
  it('contains key security and request handling sections', () => {
    const file = readFileSync(join(process.cwd(), 'server.js'), 'utf8');
    expect(file).toContain('BLOCKED_PATHS');
    expect(file).toContain('handleRequest');
    expect(file).toContain('getSecurityHeaders');
    expect(file).toContain('createServer');
  });
});
