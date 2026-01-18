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
  // Sort keys to ensure deterministic string representation if needed,
  // but for MVP we will just use a specific order of critical fields.
  interface Signable {
    sessionId?: string;
    serverSessionId?: string;
    player?: { score?: number; kills?: number; survivalTimeMs?: number };
    bitcoin?: { pnlAtDeath?: number };
  }
  const d = data as Signable;
  const criticalFields = {
    sessionId: d.sessionId,
    serverSessionId: d.serverSessionId,
    score: d.player?.score ?? 0,
    kills: d.player?.kills ?? 0,
    pnl: d.bitcoin?.pnlAtDeath ?? 0,
    duration: Math.floor((d.player?.survivalTimeMs ?? 0) / 1000),
  };

  return JSON.stringify(criticalFields);
}
