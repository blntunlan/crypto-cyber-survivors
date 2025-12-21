import React from 'react';
import { CRYPTO_PAIRS, type CryptoPair } from '../../types/crypto';

interface CryptoSelectorProps {
  selected: CryptoPair;
  onSelect: (pair: CryptoPair) => void;
  disabled?: boolean;
}

export const CryptoSelector: React.FC<CryptoSelectorProps> = ({ selected, onSelect, disabled }) => {
  const pairs = Object.values(CRYPTO_PAIRS);

  return (
    <div className="flex gap-2 justify-center">
      {pairs.map(pair => (
        <button
          key={pair.id}
          onClick={() => onSelect(pair.id)}
          disabled={disabled}
          className={`
            px-4 py-3 rounded-xl border transition-all flex flex-col items-center
            ${
              selected === pair.id
                ? 'ring-2 scale-105 shadow-lg'
                : 'opacity-60 hover:opacity-100 hover:bg-white/5'
            }
          `}
          style={{
            borderColor: pair.color + '40',
            backgroundColor: selected === pair.id ? pair.color + '20' : 'transparent',
            color: pair.color,
            boxShadow: selected === pair.id ? `0 0 20px ${pair.color}20` : 'none',
          }}
        >
          <span className="text-2xl filter drop-shadow-md mb-1">{pair.icon}</span>
          <span className="text-[10px] font-black tracking-widest uppercase opacity-90">
            {pair.id}
          </span>
        </button>
      ))}
    </div>
  );
};
