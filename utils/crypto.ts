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
  // Must match railway-market-server/src/routes/sessions.ts verificationPayload field order exactly.
  const criticalFields: Record<string, unknown> = {
    sessionId: String(data.sessionId ?? ''),
    pair: String(data.pair ?? ''),
    position: String(data.position ?? ''),
    leverage: Number(data.leverage ?? 0),
    claimedEntryPrice: Number(data.claimedEntryPrice ?? 0),
    claimedExitPrice: Number(data.claimedExitPrice ?? 0),
    claimedPnL: Number(data.claimedPnL ?? 0),
    kills: Number(data.kills ?? 0),
    level: Number(data.level ?? 0),
    survivalSeconds:
      data.survivalSeconds != null
        ? Math.floor(Number(data.survivalSeconds))
        : Math.floor(Number(data.survivalTimeMs ?? 0) / 1000),
    exitType: String(data.exitType ?? 'death'),
    portalType: data.portalType ?? null,
    maxStreak: Number(data.maxStreak ?? 0),
  };

  // Append reward fields only when present (backward compat: old payloads without these
  // fields produce the same signature as before).
  if (data.rawCoins !== undefined) {
    criticalFields.rawCoins = Number(data.rawCoins);
  }
  if (data.enemyDropCoins !== undefined) {
    criticalFields.enemyDropCoins = Number(data.enemyDropCoins);
  }
  if (data.totalCoins !== undefined) {
    criticalFields.totalCoins = Number(data.totalCoins);
  }
  if (data.pnlPercent !== undefined) {
    criticalFields.pnlPercent = Number(data.pnlPercent);
  }

  return JSON.stringify(criticalFields);
}
