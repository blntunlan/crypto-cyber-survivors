import React from 'react';
import { audio } from '../../services/audio';
import { motion } from 'framer-motion';
import { CRYPTO_PAIRS, type CryptoPair } from '../../types/crypto';
import {
  IconBitcoin,
  IconEthereum,
  IconSolana,
  IconTrendUp,
  IconTrendDown,
} from '../icons/CardIcons';
import { useTheme } from '../../contexts/useTheme';

// Icon lookup
const getCryptoIcon = (id: CryptoPair, size: number = 32) => {
  switch (id) {
    case 'BTC':
      return <IconBitcoin size={size} />;
    case 'ETH':
      return <IconEthereum size={size} />;
    case 'SOL':
      return <IconSolana size={size} />;
    default:
      return null;
  }
};

interface CryptoSelectorProps {
  selected: CryptoPair;
  onSelect: (pair: CryptoPair) => void;
  disabled?: boolean;
  isFocused?: boolean;
}

export const CryptoSelector: React.FC<CryptoSelectorProps> = ({
  selected,
  onSelect,
  disabled,
  isFocused: _isFocused = false,
}) => {
  const { isRetro } = useTheme();
  const pairs = Object.values(CRYPTO_PAIRS);

  return (
    <div className="flex gap-3 justify-center">
      {pairs.map(pair => (
        <motion.button
          key={pair.id}
          onClick={() => {
            audio.playPairSelect();
            onSelect(pair.id);
          }}
          disabled={disabled}
          className={`
            relative px-3 py-1.5 transition-all flex flex-col items-center gap-1 min-w-[60px]
            ${isRetro ? `border-2 border-zinc-700 bg-zinc-900/50 rounded-none` : 'rounded-lg'}
            ${
              selected === pair.id
                ? `scale-105 z-10 ${isRetro ? '!border-white bg-zinc-800' : ''}`
                : 'opacity-30 hover:opacity-60 grayscale hover:grayscale-0'
            }
          `}
          style={{
            background:
              selected === pair.id && !isRetro
                ? `radial-gradient(circle at center, ${pair.color}25 0%, transparent 70%)`
                : 'transparent',
            boxShadow:
              selected === pair.id && !isRetro
                ? `0 10px 30px -10px ${pair.color}50, inset 0 0 15px ${pair.color}20`
                : 'none',
          }}
          whileHover={{ scale: selected === pair.id ? 1.1 : 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Active indicator line */}
          {selected === pair.id && (
            <motion.div
              layoutId="active-pair-indicator"
              className={`absolute -bottom-0.5 w-6 h-0.5 ${isRetro ? 'rounded-none' : 'rounded-full'}`}
              style={{
                backgroundColor: pair.color,
                boxShadow: isRetro ? 'none' : `0 0 8px ${pair.color}`,
              }}
            />
          )}

          <motion.div
            animate={
              selected === pair.id
                ? {
                    y: [0, -2, 0],
                  }
                : {}
            }
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {getCryptoIcon(pair.id, 28)}
          </motion.div>
          <span
            className={`text-[7px] ${isRetro ? 'font-retro-pixel' : 'font-cyber'} tracking-widest uppercase`}
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
export const LongIcon = ({ size: _size = 40 }: { size?: number }) => (
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
      <IconTrendUp className="text-green-400 w-10 h-10" color="#4ade80" />
    </motion.div>
  </div>
);

export const ShortIcon = ({ size: _size = 40 }: { size?: number }) => (
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
      <IconTrendDown className="text-red-400 w-10 h-10" color="#f87171" />
    </motion.div>
  </div>
);
