import React from 'react';
import { motion } from 'framer-motion';
import { COLORS } from '../../constants';
import { Z_LAYERS } from '../../constants/ZIndex';
import { useGameStore } from '../../stores/gameStore';
import { useThemeSize } from '../../hooks/useThemeSize';
import { useIsRetro } from '../../contexts/useTheme';
import { IconTrophy } from '../icons/CardIcons';
import { useLanguage } from '../../contexts/LanguageContext';
import { audio } from '../../services/audio';
import { cn } from '../../utils/classnames';

interface GameOverScreenProps {
  level: number;
  finalPnl: number;
  survivalTime: number;
  kills: number;
  onRestart: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  level,
  finalPnl,
  survivalTime,
  kills,
  onRestart,
}) => {
  const sizes = useThemeSize();
  const isRetro = useIsRetro();
  const { t } = useLanguage();
  const { progress, recordGameEnd } = useGameStore();

  const hasRecordedRef = React.useRef(false);

  // Record this game to progress on mount
  React.useEffect(() => {
    if (hasRecordedRef.current) return;
    hasRecordedRef.current = true;

    const score = Math.floor(
      kills * 10 + survivalTime + (finalPnl > 0 ? finalPnl * 1000 : 0)
    );
    recordGameEnd(score, level, survivalTime, kills);
  }, [kills, level, survivalTime, finalPnl, recordGameEnd]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isNewHighScore = Math.floor(kills * 10 + survivalTime) > progress.highScore;

  // Play game end sounds
  React.useEffect(() => {
    audio.playDeath();
    if (isNewHighScore) {
      setTimeout(() => {
        audio.playAchievementGlint();
      }, 1000);
    }
  }, [isNewHighScore]);

  return (
    <motion.div
      className="allow-scroll fixed inset-0 flex flex-col items-center justify-center overflow-y-auto bg-slate-950 p-4 text-center"
      style={{ zIndex: Z_LAYERS.GAME_OVER }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Glitch Title */}
      <motion.h2
        className={cn(
          isRetro ? 'font-retro-pixel' : 'cyber-glitch-text font-cyber',
          sizes.title,
          'relative my-auto mb-4 font-black italic tracking-tighter text-white md:text-8xl'
        )}
        initial={{ scale: 2, opacity: 0, filter: 'blur(20px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        transition={{
          type: 'spring',
          stiffness: 100,
          damping: 15,
          delay: 0.2,
        }}
      >
        <motion.span
          animate={{
            textShadow: [
              `2px 0 ${COLORS.CASINO_RED}, -2px 0 ${COLORS.ELECTRIC_BLUE}`,
              `-2px 0 ${COLORS.CASINO_RED}, 2px 0 ${COLORS.ELECTRIC_BLUE}`,
              `2px 0 ${COLORS.CASINO_RED}, -2px 0 ${COLORS.ELECTRIC_BLUE}`,
            ],
          }}
          transition={{ duration: 0.1, repeat: 3 }}
        >
          {t('common.game_over_screen.liquidated')}
        </motion.span>
      </motion.h2>

      {/* Stats Card */}
      <motion.div
        className={cn(
          'mb-auto w-full max-w-md space-y-6 p-6 transition-all md:p-10',
          isRetro
            ? 'rounded-none border-4 border-[var(--color-primary)] bg-zinc-900'
            : 'cyber-glass rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.5)]'
        )}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.4 }}
      >
        {/* New High Score Badge */}
        {isNewHighScore && (
          <motion.div
            className="flex items-center justify-center gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-4 py-2 text-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.8 }}
          >
            <IconTrophy className="h-4 w-4" color={isRetro ? '#ffd600' : '#eab308'} />
            <span
              className={`font-black text-yellow-500 ${sizes.small} uppercase tracking-widest`}
            >
              {t('common.game_over_screen.new_high_score')}
            </span>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className={cn('grid grid-cols-2 text-left', sizes.gap)}>
          <StatItem
            label={t('common.level_label', { defaultValue: 'Level' }) as string}
            value={`L${level}`}
            delay={0.5}
            sizes={sizes}
            isRetro={isRetro}
          />

          <StatItem
            label={t('common.game_over_screen.pnl') as string}
            value={`${(finalPnl * 100).toFixed(1)}%`}
            color={finalPnl >= 0 ? COLORS.PUMP_GREEN : COLORS.DUMP_ORANGE}
            delay={0.6}
            sizes={sizes}
            isRetro={isRetro}
          />
          <StatItem
            label={t('common.game_over_screen.time') as string}
            value={formatTime(survivalTime)}
            delay={0.7}
            sizes={sizes}
            isRetro={isRetro}
          />
          <StatItem
            label={t('common.game_over_screen.kills') as string}
            value={kills.toString()}
            delay={0.8}
            sizes={sizes}
            isRetro={isRetro}
          />
        </div>

        {/* Career Stats */}
        <motion.div
          className="border-t border-white/10 pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <p
            className={cn(
              sizes.tiny,
              'mb-3 font-black uppercase tracking-widest text-slate-500'
            )}
          >
            {t('common.game_over_screen.career_stats') as string}
          </p>

          <div className={cn('grid grid-cols-3 text-center', sizes.gap)}>
            <div>
              <p className={`${sizes.stat} font-black text-white`}>
                {progress.totalGamesPlayed}
              </p>

              <p className={`${sizes.tiny} uppercase text-slate-500`}>
                {t('common.game_over_screen.games') as string}
              </p>
            </div>

            <div>
              <p className={`${sizes.stat} font-black text-white`}>
                {progress.totalKills}
              </p>

              <p className={`${sizes.tiny} uppercase text-slate-500`}>
                {t('common.game_over_screen.total_kills') as string}
              </p>
            </div>

            <div>
              <p className={`${sizes.stat} font-black text-white`}>
                L{progress.highestLevel}
              </p>

              <p className={`${sizes.tiny} uppercase text-slate-500`}>
                {t('common.game_over_screen.best_level') as string}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Restart Button */}
        <motion.button
          onClick={onRestart}
          className={cn(
            'w-full rounded-lg bg-white font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-yellow-500',
            sizes.buttonLg
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {t('common.game_over_screen.back_to_menu') as string}
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

// Stat Item Component
interface StatItemProps {
  label: string;
  value: string;
  color?: string;
  delay: number;
  sizes: ReturnType<typeof useThemeSize>;
}

const StatItem: React.FC<StatItemProps & { isRetro?: boolean }> = ({
  label,
  value,
  color = '#ffffff',
  delay,
  sizes,
  isRetro,
}) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
  >
    <p
      className={cn(
        'text-slate-500 font-black uppercase',
        sizes.tiny,
        isRetro ? 'font-retro-text' : ''
      )}
    >
      {label}
    </p>
    <p
      className={cn(
        sizes.heading,
        'font-black',
        isRetro ? 'font-retro-text' : 'font-cyber'
      )}
      style={{ color: isRetro && color === '#ffffff' ? '#ffffff' : color }}
    >
      {value}
    </p>
  </motion.div>
);
