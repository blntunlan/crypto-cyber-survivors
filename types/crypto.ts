export type CryptoPair = 'BTC' | 'ETH' | 'SOL';

export interface CryptoConfig {
  id: CryptoPair;
  name: string;
  symbol: string; // BTCUSDT, ETHUSDT, SOLUSDT
  displayName: string; // Bitcoin, Ethereum, Solana
  color: string; // Brand color
  icon: string; // Emoji or icon path
  binanceSymbol: string; // btcusdt, ethusdt, solusdt
  coinbaseProductId: string; // BTC-USD, ETH-USD, SOL-USD
  decimals: number; // Price decimals
}

export const CRYPTO_PAIRS: Record<CryptoPair, CryptoConfig> = {
  BTC: {
    id: 'BTC',
    name: 'Bitcoin',
    symbol: 'BTCUSDT',
    displayName: 'Bitcoin',
    color: '#F7931A',
    icon: '₿',
    binanceSymbol: 'btcusdt',
    coinbaseProductId: 'BTC-USD',
    decimals: 2,
  },
  ETH: {
    id: 'ETH',
    name: 'Ethereum',
    symbol: 'ETHUSDT',
    displayName: 'Ethereum',
    color: '#627EEA',
    icon: 'Ξ',
    binanceSymbol: 'ethusdt',
    coinbaseProductId: 'ETH-USD',
    decimals: 2,
  },
  SOL: {
    id: 'SOL',
    name: 'Solana',
    symbol: 'SOLUSDT',
    displayName: 'Solana',
    color: '#9945FF',
    icon: '◎',
    binanceSymbol: 'solusdt',
    coinbaseProductId: 'SOL-USD',
    decimals: 2,
  },
};
