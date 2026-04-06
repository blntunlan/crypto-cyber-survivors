import { vi } from 'vitest';

/**
 * Creates a mock pg.Pool for testing without a real database.
 */
export function createMockPool() {
  const mockQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
  return {
    query: mockQuery,
    totalCount: 1,
    idleCount: 1,
    waitingCount: 0,
    connect: vi.fn(),
    end: vi.fn(),
  };
}

/**
 * Mock Express request object.
 */
export function createMockRequest(overrides: Record<string, unknown> = {}) {
  return {
    headers: { authorization: 'Bearer test-token' },
    params: {},
    query: {},
    body: {},
    ip: '127.0.0.1',
    ...overrides,
  };
}

/**
 * Mock Express response object.
 */
export function createMockResponse() {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  return res;
}
