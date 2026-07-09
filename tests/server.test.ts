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

  it('blocks common credential probe paths before SPA fallback', () => {
    const file = readFileSync(join(process.cwd(), 'server.js'), 'utf8');
    expect(file).toContain("'/gcp-credentials.json'");
    expect(file).toContain("'/google-credentials.json'");
    expect(file).toContain("'/service-account.json'");
    expect(file).toContain("'/secrets.json'");
    expect(file).toContain("'/.aws'");
    expect(file).toContain("'/.vscode'");
    expect(file).toContain("'/sftp.json'");
    expect(file).toContain("'/api/env'");
    expect(file).toContain("'/api/config'");
    expect(file).toContain('hasBlockedDotPathSegment');
    expect(file).toContain('shouldServeSpaFallback');
  });

  it('exempts the market stream proxy path from blocked-path matching', () => {
    const file = readFileSync(join(process.cwd(), 'server.js'), 'utf8');
    expect(file).toContain('urlPath !== MARKET_STREAM_PATH &&');
  });
});
