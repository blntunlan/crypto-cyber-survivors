/**
 * Crypto utility for HMAC signing of game results.
 * Uses Web Crypto API for browser compatibility.
 */

/**
 * Signs a payload string with a secret key using HMAC-SHA256.
 * @param payload The string payload to sign
 * @param secret The secret signing key
 * @returns Hex string of the signature
 */
export async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);

  // Convert ArrayBuffer to Hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validates if the data appears to be a valid JSON that could be signed.
 * Minimal sanity check before transmission.
 */
export function createSignablePayload(data: Record<string, unknown>): string {
  // Use fields that match VerificationData and Supabase's createPayload
  const criticalFields = {
    sessionId: String(data.sessionId ?? ''),
    serverSessionId: String(data.sessionId ?? ''), // Supabase expects serverSessionId too
    score: Number(data.optimisticReward ?? 0),
    kills: Number(data.kills ?? 0),
    pnl: Number(data.claimedPnL ?? 0),
    duration: Math.floor(Number(data.survivalTimeMs ?? 0) / 1000),
  };

  return JSON.stringify(criticalFields);
}
