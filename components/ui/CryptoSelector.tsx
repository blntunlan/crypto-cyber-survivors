import React from 'react';
import { motion } from 'framer-motion';
import { CRYPTO_PAIRS, type CryptoPair } from '../../types/crypto';
import { TrendingUp, TrendingDown } from 'lucide-react';

// SVG Crypto Icons
const BitcoinIcon = ({ size = 24, color = '#F7931A' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill={color} />
    <path
      d="M22.5 14.2c.3-2-.2-3.3-1.4-4.2-1.1-.8-2.7-1-4.3-.9V6h-1.6v3h-1.3V6h-1.6v3H9v2h1.2c.5 0 .8.3.8.8v8.4c0 .5-.3.8-.8.8H9v2h3.3v3h1.6v-3h1.3v3h1.6v-3.1c2.7-.2 4.6-.9 5-3.4.3-2-.8-2.9-2.3-3.3zm-6.3-3.1h1.5c1.2 0 2.4.2 2.4 1.6 0 1.5-1.2 1.7-2.4 1.7h-1.5v-3.3zm1.8 9.8h-1.8v-3.6h1.8c1.4 0 2.7.3 2.7 1.8 0 1.6-1.3 1.8-2.7 1.8z"
      fill="white"
    />
  </svg>
);

const EthereumIcon = ({ size = 24, color = '#627EEA' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill={color} />
    <path d="M16 4v9.5l8 3.6L16 4z" fill="white" fillOpacity="0.6" />
    <path d="M16 4L8 17.1l8-3.6V4z" fill="white" />
    <path d="M16 21.9v6.1l8-11.1-8 5z" fill="white" fillOpacity="0.6" />
    <path d="M16 28V21.9l-8-5 8 11.1z" fill="white" />
    <path d="M16 20.4l8-3.6-8-3.6v7.2z" fill="white" fillOpacity="0.2" />
    <path d="M8 16.8l8 3.6v-7.2l-8 3.6z" fill="white" fillOpacity="0.6" />
  </svg>
);

const SolanaIcon = ({ size = 24, color = '#9945FF' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill={color} />
    <path
      d="M9.5 19.8c.1-.1.3-.2.5-.2h12.8c.3 0 .5.4.3.6l-2.4 2.4c-.1.1-.3.2-.5.2H7.4c-.3 0-.5-.4-.3-.6l2.4-2.4z"
      fill="white"
    />
    <path
      d="M9.5 9.4c.1-.1.3-.2.5-.2h12.8c.3 0 .5.4.3.6l-2.4 2.4c-.1.1-.3.2-.5.2H7.4c-.3 0-.5-.4-.3-.6l2.4-2.4z"
      fill="white"
    />
    <path
      d="M22.5 14.6c-.1-.1-.3-.2-.5-.2H9.2c-.3 0-.5.4-.3.6l2.4 2.4c.1.1.3.2.5.2h12.8c.3 0 .5-.4.3-.6l-2.4-2.4z"
      fill="white"
    />
  </svg>
);

// Icon lookup
const getCryptoIcon = (id: CryptoPair, size: number = 32) => {
  switch (id) {
    case 'BTC':
      return <BitcoinIcon size={size} />;
    case 'ETH':
      return <EthereumIcon size={size} />;
    case 'SOL':
      return <SolanaIcon size={size} />;
    default:
      return null;
  }
};

interface CryptoSelectorProps {
  selected: CryptoPair;
  onSelect: (pair: CryptoPair) => void;
  disabled?: boolean;
}

export const CryptoSelector: React.FC<CryptoSelectorProps> = ({ selected, onSelect, disabled }) => {
  const pairs = Object.values(CRYPTO_PAIRS);

  return (
    <div className="flex gap-3 justify-center">
      {pairs.map(pair => (
        <motion.button
          key={pair.id}
          onClick={() => onSelect(pair.id)}
          disabled={disabled}
          className={`
            px-5 py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 min-w-[80px]
            ${
              selected === pair.id
                ? 'ring-2 ring-offset-2 ring-offset-slate-900 scale-105'
                : 'opacity-50 hover:opacity-90 hover:bg-white/5'
            }
          `}
          style={{
            borderColor: selected === pair.id ? pair.color : pair.color + '30',
            backgroundColor: selected === pair.id ? pair.color + '15' : 'transparent',
            boxShadow: selected === pair.id ? `0 0 25px ${pair.color}30` : 'none',
          }}
          whileHover={{ scale: selected === pair.id ? 1.05 : 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            animate={
              selected === pair.id
                ? {
                    y: [0, -3, 0],
                  }
                : {}
            }
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {getCryptoIcon(pair.id, 36)}
          </motion.div>
          <span
            className="text-[10px] font-black tracking-widest uppercase"
            style={{ color: pair.color }}
          >
            {pair.id}
          </span>
        </motion.button>
      ))}
    </div>
  );
};

// Export position button icons for MainMenu
export const LongIcon = ({ size = 40 }: { size?: number }) => (
  <div className="relative">
    <motion.div
      className="p-3 rounded-xl bg-green-500/20 border border-green-500/30"
      animate={{
        boxShadow: [
          '0 0 0 rgba(34, 197, 94, 0)',
          '0 0 20px rgba(34, 197, 94, 0.3)',
          '0 0 0 rgba(34, 197, 94, 0)',
        ],
      }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <TrendingUp size={size} className="text-green-400" strokeWidth={2.5} />
    </motion.div>
  </div>
);

export const ShortIcon = ({ size = 40 }: { size?: number }) => (
  <div className="relative">
    <motion.div
      className="p-3 rounded-xl bg-red-500/20 border border-red-500/30"
      animate={{
        boxShadow: [
          '0 0 0 rgba(239, 68, 68, 0)',
          '0 0 20px rgba(239, 68, 68, 0.3)',
          '0 0 0 rgba(239, 68, 68, 0)',
        ],
      }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <TrendingDown size={size} className="text-red-400" strokeWidth={2.5} />
    </motion.div>
  </div>
);
