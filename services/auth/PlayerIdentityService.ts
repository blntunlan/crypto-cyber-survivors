import { DeviceProfiler } from '../analytics/DeviceProfiler';
import { Logger } from '../system/Logger';
import { SecurityUtils } from './SecurityUtils';

/**
 * PlayerIdentityService - Generates unique identifiers for players using device data.
 *
 * Ensures that every player has a unique hash tied to their device fingerprint,
 * preventing account sharing or spoofing while maintaining nickname uniqueness.
 */
export class PlayerIdentityService {
  /**
   * Generates a stable unique hash for a player based on nickname and device.
   * Uses SHA-256 for collision resistance.
   */
  static async generatePlayerHash(nickname: string): Promise<string> {
    const fingerprint = DeviceProfiler.getFingerprint();
    const data = `${nickname.trim()}:${fingerprint}`;

    try {
      if (!SecurityUtils.isSecureContext()) {
        throw new Error('Non-secure context');
      }
      const msgUint8 = new TextEncoder().encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      Logger.debug(`[Identity] Generated player hash for ${nickname}`);
      return hashHex;
    } catch (error) {
      Logger.warn(
        '[Identity] Hash generation using SubtleCrypto unavailable, falling back to basic encoding',
        { reason: error instanceof Error ? error.message : 'Unknown' }
      );
      // Fallback if SubtleCrypto is unavailable (e.g. non-secure context)
      return btoa(data).substring(0, 32);
    }
  }

  /**
   * Validates if a stored login hash matches the current device.
   */
  static async validateIdentity(
    nickname: string,
    storedHash: string
  ): Promise<boolean> {
    const freshHash = await this.generatePlayerHash(nickname);
    return freshHash === storedHash;
  }
}
