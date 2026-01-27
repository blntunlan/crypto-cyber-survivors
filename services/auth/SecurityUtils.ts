/**
 * SecurityUtils - Common security and environment utilities
 */

export class SecurityUtils {
  /**
   * Detects if the current environment is a local development environment.
   * Includes localhost, 127.0.0.1, and common private LAN IP ranges.
   */
  static isLocalEnvironment(): boolean {
    const hostname = window.location.hostname;

    // Standard local names
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0'
    ) {
      return true;
    }

    // Private IPv4 ranges (excluding public ones)
    // 192.168.0.0 - 192.168.255.255
    if (hostname.startsWith('192.168.')) {
      return true;
    }

    // 10.0.0.0 - 10.255.255.255
    if (hostname.startsWith('10.')) {
      return true;
    }

    // 172.16.0.0 - 172.31.255.255
    if (hostname.startsWith('172.')) {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        const secondPart = parseInt(parts[1] ?? '0', 10);
        if (secondPart >= 16 && secondPart <= 31) {
          return true;
        }
      }
    }

    // Allow for dev environments with specific patterns if needed
    if (import.meta.env.DEV && hostname.includes('.local')) {
      return true;
    }

    return false;
  }

  /**
   * Checks if the current context is secure (HTTPS or localhost).
   * Web Crypto API (crypto.subtle) requires a secure context.
   */
  static isSecureContext(): boolean {
    return window.isSecureContext || window.location.protocol === 'https:';
  }
}
