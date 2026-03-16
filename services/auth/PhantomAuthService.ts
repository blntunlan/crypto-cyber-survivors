/**
 * PhantomAuthService - Web3 Wallet Authentication via Phantom
 *
 * Supports:
 * - Phantom wallet connection
 * - Message signing for authentication
 * - Wallet address linking to profiles
 * - Multi-wallet support (future: MetaMask, Solflare)
 *
 * @see https://docs.phantom.app/solana/integrating-phantom
 */

import { Logger } from '../system/Logger';
import { EventBus } from '../core/EventBus';
import { isSupabaseConfigured } from '../supabase/client';
import { railwayClient } from '../api/RailwayClient';
import bs58 from 'bs58';

// ============================================
// Types
// ============================================

export interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: { toBase58(): string; toBytes(): Uint8Array };
  isConnected?: boolean;
  signMessage(
    message: Uint8Array,
    display?: string
  ): Promise<{ signature: Uint8Array }>;
  connect(opts?: {
    onlyIfTrusted?: boolean;
  }): Promise<{ publicKey: { toBase58(): string } }>;
  disconnect(): Promise<void>;
  on(event: string, callback: (args: unknown) => void): void;
  off(event: string, callback: (args: unknown) => void): void;
}

export interface WalletAuthResult {
  success: boolean;
  walletAddress?: string;
  signature?: string;
  error?: string;
  isNewUser?: boolean;
}

export interface WalletProfile {
  id: string;
  walletAddress: string;
  displayName: string;
  createdAt: string;
}

// ============================================
// Service Class
// ============================================

class PhantomAuthServiceClass {
  private static instance: PhantomAuthServiceClass | null = null;

  static getInstance(): PhantomAuthServiceClass {
    return (PhantomAuthServiceClass.instance ??= new PhantomAuthServiceClass());
  }

  // ============================================
  // Provider Detection
  // ============================================

  /**
   * Check if Phantom wallet is installed
   */
  isPhantomInstalled(): boolean {
    const phantom = this.getProvider();
    return phantom !== null;
  }

  /**
   * Get Phantom provider from window
   */
  private getProvider(): PhantomProvider | null {
    if (typeof window === 'undefined') return null;

    const windowWithPhantom = window as unknown as {
      phantom?: { solana?: PhantomProvider };
    };
    const provider = windowWithPhantom.phantom?.solana;

    if (provider?.isPhantom) {
      return provider;
    }

    return null;
  }

  /**
   * Open Phantom download page
   */
  openPhantomDownload(): void {
    window.open('https://phantom.app/', '_blank');
  }

  // ============================================
  // Wallet Connection
  // ============================================

  /**
   * Connect to Phantom wallet
   */
  async connect(): Promise<WalletAuthResult> {
    const provider = this.getProvider();

    if (!provider) {
      return {
        success: false,
        error: 'Phantom wallet not installed. Please install it from phantom.app',
      };
    }

    try {
      // Request connection
      const response = await provider.connect();
      const walletAddress = response.publicKey.toBase58();

      Logger.info(`[PhantomAuth] Connected to wallet: ${walletAddress.slice(0, 8)}...`);

      return {
        success: true,
        walletAddress,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Connection rejected';
      Logger.error('[PhantomAuth] Connection failed:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Disconnect from Phantom wallet
   */
  async disconnect(): Promise<void> {
    const provider = this.getProvider();
    if (provider) {
      await provider.disconnect();
      Logger.info('[PhantomAuth] Disconnected from wallet');
    }
  }

  // ============================================
  // Authentication via Signature
  // ============================================

  /**
   * Authenticate by signing a message
   * This proves ownership of the wallet
   */
  async authenticate(): Promise<WalletAuthResult> {
    const provider = this.getProvider();

    if (!provider) {
      return {
        success: false,
        error: 'Phantom wallet not installed',
      };
    }

    try {
      // Connect first if not connected
      if (!provider.isConnected) {
        const connectResult = await this.connect();
        if (!connectResult.success) {
          return connectResult;
        }
      }

      const walletAddress = provider.publicKey?.toBase58();
      if (!walletAddress) {
        return { success: false, error: 'Could not get wallet address' };
      }

      // Create message to sign
      const timestamp = Date.now();
      const nonce = Math.random().toString(36).substring(2, 15);
      const message = `Sign this message to authenticate with Crypto Survivors.\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;

      // Request signature
      const encodedMessage = new TextEncoder().encode(message);
      const { signature } = await provider.signMessage(encodedMessage, 'utf8');
      const signatureBase58 = bs58.encode(signature);

      Logger.info('[PhantomAuth] Message signed successfully');

      // Link wallet to profile in database
      const linkResult = await this.linkWalletToProfile(walletAddress, signatureBase58);

      if (!linkResult.success) {
        return linkResult;
      }

      // Emit auth event
      EventBus.emit('authStateChanged', {
        type: 'signIn',
        user: { walletAddress },
        session: null,
      });

      return {
        success: true,
        walletAddress,
        signature: signatureBase58,
        isNewUser: linkResult.isNewUser,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Signature rejected';
      Logger.error('[PhantomAuth] Authentication failed:', error);

      return {
        success: false,
        error:
          errorMessage === 'User rejected the request.'
            ? 'Signature rejected by user'
            : errorMessage,
      };
    }
  }

  // ============================================
  // Profile Linking
  // ============================================

  /**
   * Link wallet address to user profile
   */
  private async linkWalletToProfile(
    walletAddress: string,
    _signature: string
  ): Promise<WalletAuthResult> {
    if (!isSupabaseConfigured()) {
      // Offline mode - just return success
      return { success: true, walletAddress, isNewUser: true };
    }

    try {
      // Create or fetch profile via Railway API
      const displayName = `Wallet_${walletAddress.slice(0, 6)}`;
      await railwayClient.post('/api/v1/profile', {
        nickname: displayName,
      });

      Logger.info('[PhantomAuth] Wallet user profile ensured');
      return { success: true, walletAddress, isNewUser: false };
    } catch (error) {
      Logger.error('[PhantomAuth] Database error:', error);
      return { success: false, error: 'Database error' };
    }
  }

  // ============================================
  // Utilities
  // ============================================

  /**
   * Get currently connected wallet address
   */
  getConnectedAddress(): string | null {
    const provider = this.getProvider();
    if (provider?.isConnected && provider.publicKey) {
      return provider.publicKey.toBase58();
    }
    return null;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    const provider = this.getProvider();
    return provider?.isConnected ?? false;
  }

  /**
   * Format wallet address for display (truncated)
   */
  formatAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  // ============================================
  // Event Listeners
  // ============================================

  /**
   * Listen for wallet connection changes
   */
  onConnectionChange(callback: (connected: boolean) => void): () => void {
    const provider = this.getProvider();
    if (!provider) return () => {};

    const handleConnect = () => callback(true);
    const handleDisconnect = () => callback(false);

    provider.on('connect', handleConnect);
    provider.on('disconnect', handleDisconnect);

    return () => {
      provider.off('connect', handleConnect);
      provider.off('disconnect', handleDisconnect);
    };
  }

  // ============================================
  // Cleanup
  // ============================================

  static resetInstance(): void {
    PhantomAuthServiceClass.instance = null;
  }
}

// Export singleton instance
export const PhantomAuthService = PhantomAuthServiceClass.getInstance();

// Export class for testing
export { PhantomAuthServiceClass };
