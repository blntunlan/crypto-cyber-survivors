import React from 'react';
import { audio } from '../../services/audio/AudioService';
import { CRYPTO_PAIRS, type CryptoPair } from '../../types/crypto';
import { IconBitcoin, IconEthereum, IconSolana } from '../icons/CardIcons';
import { ThemedSelectionCard } from '../themed/ThemedSelectionCard';

const ASSET_ICON_CLASS = 'size-9 sm:size-10';

const getCryptoIcon = (id: CryptoPair) => {
  switch (id) {
    case 'BTC':
      return <IconBitcoin className={ASSET_ICON_CLASS} />;
    case 'ETH':
      return <IconEthereum className={ASSET_ICON_CLASS} />;
    case 'SOL':
      return <IconSolana className={ASSET_ICON_CLASS} />;
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
  const pairs = Object.values(CRYPTO_PAIRS);

  return (
    <div className="grid w-full grid-cols-3 gap-2 sm:mx-auto sm:max-w-[300px] sm:gap-3">
      {pairs.map(pair => {
        const isSelected = selected === pair.id;

        return (
          <ThemedSelectionCard
            key={pair.id}
            aria-label={pair.id}
            accentColor={pair.color}
            disabled={disabled}
            onClick={() => {
              audio.playPairSelect();
              onSelect(pair.id);
            }}
            selected={isSelected}
            variant="asset"
            className="w-full flex-col items-center justify-center gap-1.5"
          >
            <span data-asset-icon className="flex shrink-0 items-center justify-center">
              {getCryptoIcon(pair.id)}
            </span>
            <span
              data-asset-label={pair.id}
              className="text-[10px] font-bold uppercase leading-none tracking-[0.12em]"
            >
              {pair.id}
            </span>
            {isSelected && (
              <span
                aria-hidden="true"
                className="absolute inset-x-3 bottom-2 h-px bg-current opacity-50"
              />
            )}
          </ThemedSelectionCard>
        );
      })}
    </div>
  );
};
