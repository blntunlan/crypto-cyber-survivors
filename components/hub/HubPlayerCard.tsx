/**
 * HubPlayerCard - Player info card at top of hub menu
 *
 * Shows player avatar, nickname, coin balance, and crypto tokens.
 * Adapts to Cyberpunk and Retro themes.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/useTheme';
import { COLORS } from '../../config/Colors';
import { type CharacterSkinId } from '../../types/lootbox';
import { CHARACTER_SKIN_DEFINITIONS } from '../../types/inventory';

interface HubPlayerCardProps {
  nickname: string;
  coins: number;
  cryptoBalance: {
    btc: number;
    eth: number;
    sol: number;
  };
  equippedSkin: CharacterSkinId;
  onAvatarClick?: () => void;
}

export const HubPlayerCard: React.FC<HubPlayerCardProps> = ({
  nickname,
  coins,
  cryptoBalance,
  equippedSkin,
  onAvatarClick,
}) => {
  const { isRetro } = useTheme();
  const skinDef = CHARACTER_SKIN_DEFINITIONS[equippedSkin];

  const formatCoins = (amount: number): string => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toString();
  };

  const formatCrypto = (amount: number, decimals: number = 4): string => {
    if (amount === 0) return '0.00';
    return amount.toFixed(decimals);
  };

  return (
    <div
      className={`
        w-full
        p-3 sm:p-4
        flex items-center gap-3 sm:gap-4
        ${
          isRetro
            ? 'bg-zinc-900 border-2 border-zinc-700 rounded-none shadow-[4px_4px_0px_rgba(0,0,0,0.5)]'
            : 'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl'
        }
      `}
    >
      {/* Avatar */}
      <motion.button
        onClick={onAvatarClick}
        whileHover={!isRetro ? { scale: 1.05 } : undefined}
        whileTap={!isRetro ? { scale: 0.95 } : undefined}
        className={`
          relative
          w-14 h-14 sm:w-16 sm:h-16
          flex items-center justify-center
          text-2xl sm:text-3xl
          ${
            isRetro
              ? 'bg-zinc-800 border-2 border-zinc-600 rounded-none'
              : 'bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/20'
          }
        `}
        style={{
          boxShadow: isRetro
            ? '2px 2px 0px rgba(0,0,0,0.5)'
            : `0 0 20px ${skinDef.glowColor}`,
        }}
      >
        <span>{skinDef.icon}</span>

        {/* Online indicator */}
        <div
          className={`
            absolute bottom-0 right-0
            w-3 h-3
            ${isRetro ? 'border border-zinc-900' : 'rounded-full'}
          `}
          style={{ backgroundColor: COLORS.PUMP_GREEN }}
        />
      </motion.button>

      {/* Player Info */}
      <div className="flex-1 min-w-0">
        {/* Nickname */}
        <div
          className={`
            text-sm sm:text-base
            font-black uppercase tracking-wide
            truncate
            ${isRetro ? 'font-retro-pixel text-[10px] sm:text-xs' : 'font-cyber'}
          `}
          style={{ color: skinDef.color }}
        >
          {nickname}
        </div>

        {/* Skin name */}
        <div
          className={`
            text-[10px] sm:text-xs
            text-slate-400
            truncate
            ${isRetro ? 'font-retro-pixel text-[7px]' : ''}
          `}
        >
          {skinDef.name}
        </div>
      </div>

      {/* Balances */}
      <div className="flex flex-col items-end gap-1">
        {/* Coins */}
        <div
          className={`
            flex items-center gap-1.5
            px-2 py-1
            ${
              isRetro
                ? 'bg-zinc-800 border border-zinc-600 rounded-none'
                : 'bg-white/5 rounded-lg border border-white/10'
            }
          `}
        >
          <span className="text-sm">🪙</span>
          <span
            className={`
              text-xs sm:text-sm font-black
              ${isRetro ? 'font-retro-pixel text-[8px]' : 'font-numbers'}
            `}
            style={{ color: COLORS.JACKPOT_YELLOW }}
          >
            {formatCoins(coins)}
          </span>
        </div>

        {/* Crypto tokens (if any) */}
        {(cryptoBalance.btc > 0 || cryptoBalance.eth > 0 || cryptoBalance.sol > 0) && (
          <div className="flex items-center gap-2 text-[10px] sm:text-xs">
            {cryptoBalance.btc > 0 && (
              <span style={{ color: '#F7931A' }}>
                ₿{formatCrypto(cryptoBalance.btc, 6)}
              </span>
            )}
            {cryptoBalance.eth > 0 && (
              <span style={{ color: '#627EEA' }}>
                Ξ{formatCrypto(cryptoBalance.eth, 4)}
              </span>
            )}
            {cryptoBalance.sol > 0 && (
              <span style={{ color: '#9945FF' }}>
                ◎{formatCrypto(cryptoBalance.sol, 2)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
