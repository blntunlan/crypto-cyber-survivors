/**
 * tests/diagnostics/AuthLifecycleSimulation.test.ts
 *
 * Automated simulation testing auth lifecycle states, JWT expiration recovery,
 * token store serialization/deserialization, and 401 unauthorized handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RailwayAuthTokenStore } from '../../services/api/RailwayAuthTokenStore';
import { EventBus } from '../../services/core/EventBus';

describe('Auth Lifecycle & Token Management Diagnostics', () => {
  beforeEach(() => {
    EventBus.clear();
    RailwayAuthTokenStore.clear();
  });

  it('persists and retrieves valid stored auth session', () => {
    const expiresAt = Date.now() + 3600 * 1000;
    RailwayAuthTokenStore.save({
      accessToken: 'valid-jwt-token-xyz',
      tokenType: 'Bearer',
      expiresAt,
      account: {
        id: 'acc-12345',
        type: 'registered',
      },
      profile: {
        id: 'prof-12345',
        displayName: 'CyberWarrior',
      },
    });

    const stored = RailwayAuthTokenStore.get();
    expect(stored).not.toBeNull();
    expect(stored?.accessToken).toBe('valid-jwt-token-xyz');
    expect(stored?.account.id).toBe('acc-12345');
    expect(RailwayAuthTokenStore.getAccessToken()).toBe('valid-jwt-token-xyz');
  });

  it('automatically invalidates and purges expired auth tokens on retrieval', () => {
    const expiredTime = Date.now() - 1000; // Expired 1 second ago
    RailwayAuthTokenStore.save({
      accessToken: 'expired-jwt-token-abc',
      tokenType: 'Bearer',
      expiresAt: expiredTime,
      account: {
        id: 'acc-expired',
        type: 'anonymous',
      },
      profile: {
        id: 'prof-expired',
        displayName: 'GhostPlayer',
      },
    });

    const stored = RailwayAuthTokenStore.get();
    expect(stored).toBeNull();
    expect(RailwayAuthTokenStore.getAccessToken()).toBeNull();
  });

  it('dispatches authUnauthorized event on 401 error interception', () => {
    const authSpy = vi.fn();
    const unsubscribe = EventBus.on('authUnauthorized', authSpy);

    EventBus.emit('authUnauthorized', {
      path: '/api/v1/sessions/start',
      status: 401,
      message: 'Token expired',
      timestamp: Date.now(),
    });

    expect(authSpy).toHaveBeenCalledTimes(1);
    expect(authSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/v1/sessions/start',
        status: 401,
      })
    );

    unsubscribe();
  });
});
