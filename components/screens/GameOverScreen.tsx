import React from 'react';
import { m } from 'framer-motion';
import { COLORS } from '../../config/Colors';
import { Z_LAYERS } from '../../constants/ZIndex';
import { useGameStore } from '../../stores/gameStore';
import { useThemeSize } from '../../hooks/useThemeSize';
import { useIsRetro } from '../../contexts/useTheme';
import { IconTrophy } from '../icons/CardIcons';
import { useLanguage } from '../../contexts/LanguageContext';
import { audio } from '../../services/audio';
import { cn } from '../../utils/classnames';
import { CoinService, type CoinCalculation } from '../../services/gameplay/CoinService';
import { ComboSystem } from '../../services/combat/ComboSystem';
import { ThemedButton } from '../themed/ThemedButton';
import { OverlayChrome, OverlaySectionRail } from '../ui/OverlayChrome';

interface GameOverScreenProps {
  level: number;
  finalPnl: number;
  survivalTime: number;
  kills: number;
  onRestart: () => void;
  coinsEarned?: number;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  level,
  finalPnl,
  survivalTime,
  kills,
  onRestart,
  coinsEarned = 0,
}) => {
  const sizes = useThemeSize();
  const isRetro = useIsRetro();
  const { t } = useLanguage();
  const { progress, recordGameEnd } = useGameStore();

  const hasRecordedRef = React.useRef(false);
  const [coinCalc, setCoinCalc] = React.useState<CoinCalculation | null>(null);
  const [showBreakdown, setShowBreakdown] = React.useState(false);

  React.useEffect(() => {
    if (hasRecordedRef.current) return;
    hasRecordedRef.current = true;

    const score = Math.floor(
      kills * 10 + survivalTime + (finalPnl > 0 ? finalPnl * 1000 : 0)
    );
    recordGameEnd(score, level, survivalTime, kills);

    const calc = CoinService.calculateCycleReward({
      survivalTimeSeconds: survivalTime,
      kills,
      level,
      pnl: finalPnl,
      maxStreak: ComboSystem.getMaxStreak(),
    });
    setCoinCalc(calc);
  }, [kills, level, survivalTime, finalPnl, recordGameEnd]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isNewHighScore = Math.floor(kills * 10 + survivalTime) > progress.highScore;

  React.useEffect(() => {
    audio.playDeath();
    if (!isNewHighScore) return;
    const timerId = setTimeout(() => {
      audio.playAchievementGlint();
    }, 1000);
    return () => clearTimeout(timerId);
  }, [isNewHighScore]);

  return (
    <OverlayChrome
      zIndex={Z_LAYERS.GAME_OVER}
      maxWidthClassName="max-w-3xl"
      title={t('common.game_over_screen.liquidated') as string}
      subtitle={t('common.session_halted') as string}
      accentColor={COLORS.CASINO_RED}
      contentClassName="space-y-6"
    >
      {isNewHighScore && (
        <m.div
          className="flex items-center justify-center gap-2 rounded-sm border border-yellow-500/50 bg-yellow-500/10 px-4 py-2 text-center"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        >
          <IconTrophy className="h-4 w-4" color={isRetro ? '#ffd600' : '#eab308'} />
          <span className="font-cyber text-sm font-black uppercase tracking-[0.22em] text-yellow-500">
            {t('common.game_over_screen.new_high_score')}
          </span>
        </m.div>
      )}

      <section className="space-y-3">
        <OverlaySectionRail
          label={
            t('common.game_over_screen.run_summary', {
              defaultValue: 'Run Summary',
            }) as string
          }
          color={COLORS.CASINO_RED}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatItem
            label={t('common.level_label', { defaultValue: 'Level' }) as string}
            value={`L${level}`}
            color={COLORS.TEXT}
            sizes={sizes}
            isRetro={isRetro}
          />
          <StatItem
            label={t('common.game_over_screen.pnl') as string}
            value={`${(finalPnl * 100).toFixed(2)}%`}
            color={finalPnl >= 0 ? COLORS.PUMP_GREEN : COLORS.DUMP_ORANGE}
            sizes={sizes}
            isRetro={isRetro}
          />
          <StatItem
            label={t('common.game_over_screen.time') as string}
            value={formatTime(survivalTime)}
            color={COLORS.TEXT}
            sizes={sizes}
            isRetro={isRetro}
          />
          <StatItem
            label={t('common.game_over_screen.kills') as string}
            value={kills.toString()}
            color={COLORS.TEXT}
            sizes={sizes}
            isRetro={isRetro}
          />
        </div>
      </section>

      {coinCalc && (
        <section className="space-y-3">
          <OverlaySectionRail
            label={
              t('common.game_over_screen.coins_earned', {
                defaultValue: 'Coins Earned',
              }) as string
            }
            color={COLORS.JACKPOT_YELLOW}
          />
          <div
            className={cn(
              'space-y-3 p-4',
              isRetro
                ? 'border-2 border-yellow-500/50 bg-[#0a0a12]/80'
                : 'rounded-sm border border-yellow-500/20 bg-yellow-500/5'
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-cyber text-sm font-black uppercase tracking-[0.18em] text-slate-300">
                Reward breakdown
              </span>
              <button
                onClick={() => setShowBreakdown(prev => !prev)}
                className="text-xs uppercase tracking-[0.18em] text-slate-400 underline"
              >
                {showBreakdown ? 'Hide' : 'Details'}
              </button>
            </div>

            <div
              className={cn(
                isRetro ? 'font-retro-pixel' : 'font-cyber',
                'text-2xl font-black'
              )}
              style={{ color: COLORS.JACKPOT_YELLOW }}
            >
              +{(coinsEarned > 0 ? coinsEarned : coinCalc.total).toLocaleString()}
            </div>

            {showBreakdown && (
              <div className="space-y-2 border-t border-white/10 pt-3">
                {Object.entries(coinCalc.breakdown).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="uppercase tracking-[0.12em] text-slate-500">
                      {key}
                    </span>
                    <span
                      className={cn(
                        isRetro ? 'font-retro-pixel' : 'font-numbers',
                        'font-bold'
                      )}
                      style={{ color: value > 0 ? COLORS.PUMP_GREEN : '#64748b' }}
                    >
                      +{value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <OverlaySectionRail
          label={t('common.game_over_screen.career_stats') as string}
          color={COLORS.ELECTRIC_BLUE}
        />
        <div className="grid grid-cols-3 gap-3 text-center">
          <MiniMetric
            label={t('common.game_over_screen.games') as string}
            value={progress.totalGamesPlayed.toString()}
          />
          <MiniMetric
            label={t('common.game_over_screen.total_kills') as string}
            value={progress.totalKills.toString()}
          />
          <MiniMetric
            label={t('common.game_over_screen.best_level') as string}
            value={`L${progress.highestLevel}`}
          />
        </div>
      </section>

      <ThemedButton
        intent="primary"
        onClick={onRestart}
        className="min-h-[52px] w-full text-sm font-black uppercase tracking-[0.24em]"
      >
        {t('common.game_over_screen.back_to_menu') as string}
      </ThemedButton>
    </OverlayChrome>
  );
};

interface StatItemProps {
  label: string;
  value: string;
  color: string;
  sizes: ReturnType<typeof useThemeSize>;
  isRetro?: boolean;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, color, sizes, isRetro }) => (
  <m.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      'space-y-2 p-4',
      isRetro
        ? 'border-2 border-[#39FF14]/30 bg-[#0a0a12]/80'
        : 'rounded-sm border border-white/10 bg-white/5'
    )}
  >
    <p
      className={cn(
        isRetro ? 'font-retro-pixel' : 'font-cyber',
        sizes.tiny,
        'font-black uppercase tracking-[0.2em] text-slate-500'
      )}
    >
      {label}
    </p>
    <p
      className={cn(
        isRetro ? 'font-retro-pixel' : 'font-cyber',
        sizes.heading,
        'font-black tracking-tight'
      )}
      style={{ color }}
    >
      {value}
    </p>
  </m.div>
);

const MiniMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-sm border border-white/10 bg-white/5 px-3 py-4">
    <p className="font-cyber text-lg font-black text-white">{value}</p>
    <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
      {label}
    </p>
  </div>
);
