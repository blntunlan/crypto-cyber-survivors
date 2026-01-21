import React from 'react';
import { motion } from 'framer-motion';
import { COLORS } from '../../constants';
import { Z_LAYERS } from '../../constants/ZIndex';
import { useGameStore } from '../../stores/gameStore';
import { useThemeSize } from '../../hooks/useThemeSize';
import { useIsRetro } from '../../contexts/useTheme';
import { IconTrophy } from '../icons/CardIcons';
import { useLanguage } from '../../contexts/LanguageContext';
import { audio } from '../../services/AudioService';

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

  // Record this game to progress on mount
  React.useEffect(() => {
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
      className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center text-center p-4 overflow-y-auto allow-scroll"
      style={{ zIndex: Z_LAYERS.GAME_OVER }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Glitch Title */}
      <motion.h2
        className={`${isRetro ? 'font-retro-pixel' : 'font-cyber cyber-glitch-text'} ${sizes.title} md:text-8xl font-black text-white italic tracking-tighter mb-4 my-auto relative`}
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
        className={`transition-all max-w-md w-full mb-auto p-6 md:p-10 space-y-6 ${
          isRetro
            ? 'bg-zinc-900 border-4 border-[var(--color-primary)] rounded-none'
            : 'cyber-glass rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]'
        }`}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.4 }}
      >
        {/* New High Score Badge */}
        {isNewHighScore && (
          <motion.div
            className="text-center py-2 px-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg flex items-center justify-center gap-2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.8 }}
          >
            <IconTrophy className="w-4 h-4" color={isRetro ? '#ffd600' : '#eab308'} />
            <span
              className={`text-yellow-500 font-black ${sizes.small} uppercase tracking-widest`}
            >
              {t('common.game_over_screen.new_high_score')}
            </span>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className={`grid grid-cols-2 ${sizes.gap} text-left`}>
          <StatItem
            label={t('common.level_label', { defaultValue: 'Level' })}
            value={`L${level}`}
            delay={0.5}
            sizes={sizes}
            isRetro={isRetro}
          />

          <StatItem
            label={t('common.game_over_screen.pnl')}
            value={`${(finalPnl * 100).toFixed(1)}%`}
            color={finalPnl >= 0 ? COLORS.PUMP_GREEN : COLORS.DUMP_ORANGE}
            delay={0.6}
            sizes={sizes}
            isRetro={isRetro}
          />
          <StatItem
            label={t('common.game_over_screen.time')}
            value={formatTime(survivalTime)}
            delay={0.7}
            sizes={sizes}
            isRetro={isRetro}
          />
          <StatItem
            label={t('common.game_over_screen.kills')}
            value={kills.toString()}
            delay={0.8}
            sizes={sizes}
            isRetro={isRetro}
          />
        </div>

        {/* Career Stats */}
        <motion.div
          className="pt-4 border-t border-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <p
            className={`${sizes.tiny} font-black text-slate-500 uppercase tracking-widest mb-3`}
          >
            {t('common.game_over_screen.career_stats')}
          </p>

          <div className={`grid grid-cols-3 ${sizes.gap} text-center`}>
            <div>
              <p className={`${sizes.stat} font-black text-white`}>
                {progress.totalGamesPlayed}
              </p>

              <p className={`${sizes.tiny} text-slate-500 uppercase`}>
                {t('common.game_over_screen.games')}
              </p>
            </div>

            <div>
              <p className={`${sizes.stat} font-black text-white`}>
                {progress.totalKills}
              </p>

              <p className={`${sizes.tiny} text-slate-500 uppercase`}>
                {t('common.game_over_screen.total_kills')}
              </p>
            </div>

            <div>
              <p className={`${sizes.stat} font-black text-white`}>
                L{progress.highestLevel}
              </p>

              <p className={`${sizes.tiny} text-slate-500 uppercase`}>
                {t('common.game_over_screen.best_level')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Restart Button */}
        <motion.button
          onClick={onRestart}
          className={`w-full ${sizes.buttonLg} bg-white text-black font-black uppercase tracking-[0.2em] rounded-lg hover:bg-yellow-500 transition-all`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {t('common.game_over_screen.back_to_menu')}
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
      className={`text-slate-500 ${sizes.tiny} font-black uppercase ${isRetro ? 'font-retro-text' : ''}`}
    >
      {label}
    </p>
    <p
      className={`${sizes.heading} font-black ${isRetro ? 'font-retro-text' : 'font-cyber'}`}
      style={{ color }}
    >
      {value}
    </p>
  </motion.div>
);
