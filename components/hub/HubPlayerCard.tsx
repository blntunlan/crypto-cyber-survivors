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
import { cn } from '../../utils/classnames';
import { PANEL_VARIANTS } from '../../config/themeVariants';

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
      className={cn(
        'flex w-full items-center gap-3 p-3 sm:gap-4 sm:p-4',
        isRetro
          ? PANEL_VARIANTS.retro
          : 'rounded-2xl bg-slate-900/60 border border-white/10 cyber-glass'
      )}
    >
      {!isRetro && (
        <motion.div
          className="absolute left-0 right-0 top-0 h-1 rounded-t-2xl bg-white/20"
          style={{
            background: `linear-gradient(90deg, transparent, ${skinDef.color}80, transparent)`,
            boxShadow: `0 0 15px ${skinDef.color}40`,
          }}
        />
      )}

      {/* Avatar */}
      <motion.div
        whileHover={onAvatarClick && !isRetro ? { scale: 1.05 } : undefined}
        whileTap={onAvatarClick && !isRetro ? { scale: 0.95 } : undefined}
        className={`
          relative
          flex h-14 w-14 items-center
          justify-center text-2xl sm:h-16
          sm:w-16 sm:text-3xl
          ${
            isRetro
              ? 'rounded-none border-2 border-zinc-600 bg-zinc-800'
              : 'rounded-xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5'
          }

          ${onAvatarClick ? 'cursor-pointer' : 'cursor-default'}
        `}
        style={{
          boxShadow: isRetro
            ? '2px 2px 0px rgba(0,0,0,0.5)'
            : `0 0 20px ${skinDef.glowColor}`,
        }}
        onClick={onAvatarClick}
      >
        <span>{skinDef.icon}</span>

        {/* Online indicator */}
        <div
          className={`
            absolute bottom-0 right-0
            h-3 w-3
            ${isRetro ? 'border border-zinc-900' : 'rounded-full'}
          `}
          style={{ backgroundColor: COLORS.PUMP_GREEN }}
        />
      </motion.div>

      {/* Player Info */}
      <div className="min-w-0 flex-1">
        {/* Nickname */}
        <div
          className={`
            truncate text-sm
            font-black uppercase tracking-wide
            sm:text-base
            ${isRetro ? 'font-retro-pixel text-[10px] sm:text-xs' : 'font-cyber'}
          `}
          style={{ color: skinDef.color }}
        >
          {nickname}
        </div>

        {/* Skin name */}
        <div
          className={`
            truncate text-[10px]
            text-slate-400
            sm:text-xs
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
                ? 'rounded-none border border-zinc-600 bg-zinc-800'
                : 'rounded-lg border border-white/10 bg-white/5'
            }
          `}
        >
          <span className="text-sm">🪙</span>
          <span
            className={`
              text-xs font-black sm:text-sm
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
