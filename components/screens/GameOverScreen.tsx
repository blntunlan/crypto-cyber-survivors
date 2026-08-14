import React from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { COLORS } from '../../config/Colors';
import { HUD_WAR_ROOM } from '../../config/HUDWarRoom';
import { Z_LAYERS } from '../../constants/ZIndex';
import { useGameStore } from '../../stores/gameStore';
import { useIsRetro } from '../../contexts/useTheme';
import { IconTrophy } from '../icons/CardIcons';
import { useLanguage } from '../../contexts/LanguageContext';
import { audio } from '../../services/audio/AudioService';
import { cn } from '../../utils/classnames';
import { CoinService } from '../../services/gameplay/CoinService';
import { ComboSystem } from '../../services/combat/ComboSystem';
import { ThemedButton } from '../themed/ThemedButton';
import { OverlayChrome } from '../ui/OverlayChrome';
import { GameEndReason } from '../../types/metrics';
import { type RewardSettlement } from '../../hooks/useGameFlowController';
import { type RunPerformance } from '../../types/reward';

type GameOverScreenProps = {
  level: number;
  finalPnl: number;
  survivalTime: number;
  kills: number;
  onRestart: () => void;
  endReason: GameEndReason;
  rewardSettlement: RewardSettlement;
  runPerformance?: RunPerformance | null;
};

type RewardCalculation = ReturnType<typeof CoinService.calculateCycleReward>;

const RESULT_ENTER_TRANSITION = { duration: 0.22, ease: 'easeOut' } as const;

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  level,
  finalPnl,
  survivalTime,
  kills,
  onRestart,
  endReason,
  rewardSettlement,
  runPerformance = null,
}) => {
  const isRetro = useIsRetro();
  const prefersReducedMotion = useReducedMotion();
  const { t } = useLanguage();
  const { progress, recordGameEnd } = useGameStore();

  const hasRecordedRef = React.useRef(false);
  const [showBreakdown, setShowBreakdown] = React.useState(false);
  const maxStreak = React.useMemo(() => ComboSystem.getMaxStreak(), []);
  const [resultScore] = React.useState(() =>
    Math.floor(kills * 10 + survivalTime + (finalPnl > 0 ? finalPnl * 1000 : 0))
  );
  const [isNewHighScore] = React.useState(() => resultScore > progress.highScore);
  const coinCalc = React.useMemo(
    () =>
      CoinService.calculateCycleReward({
        survivalTimeSeconds: survivalTime,
        kills,
        level,
        pnl: finalPnl,
        maxStreak,
      }),
    [finalPnl, kills, level, maxStreak, survivalTime]
  );
  const resultCopy = React.useMemo(() => {
    switch (endReason) {
      case GameEndReason.LIQUIDATION:
        return {
          title: t('common.game_over_screen.liquidated') as string,
          subtitle: 'POSITION REACHED LIQUIDATION PRICE',
        };
      case GameEndReason.CYCLE_COMPLETE:
      case GameEndReason.PORTAL:
        return { title: 'CASHED OUT', subtitle: 'AUTHORITATIVE SETTLEMENT COMPLETE' };
      case GameEndReason.DISCONNECT:
        return { title: 'DISCONNECTED', subtitle: 'RUN ENDED BEFORE SETTLEMENT' };
      case GameEndReason.QUIT:
        return { title: 'RUN ENDED', subtitle: 'PLAYER EXIT' };
      case GameEndReason.DEATH:
      default:
        return { title: 'ELIMINATED', subtitle: 'HP DEPLETED' };
    }
  }, [endReason, t]);

  React.useEffect(() => {
    if (hasRecordedRef.current) return;
    hasRecordedRef.current = true;
    recordGameEnd(resultScore, level, survivalTime, kills);
  }, [kills, level, recordGameEnd, resultScore, survivalTime]);

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
      maxWidthClassName="max-w-4xl"
      accentColor={COLORS.CASINO_RED}
      overlayPriority="decision"
      panelClassName="flex max-h-full min-h-0 flex-col !p-0"
      contentClassName="flex min-h-0 flex-1"
    >
      <m.div
        data-testid="liquidation-result"
        data-liquidation-theme={isRetro ? 'retro' : 'modern'}
        data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
        className={cn(
          'relative flex min-h-0 flex-1 flex-col overflow-hidden',
          isRetro ? 'font-retro-pixel' : 'font-cyber'
        )}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={RESULT_ENTER_TRANSITION}
      >
        <div
          data-testid="liquidation-result-body"
          className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 pt-4 sm:px-8 sm:pb-4 sm:pt-7"
        >
          <LiquidationHeader
            isRetro={isRetro}
            reducedMotion={Boolean(prefersReducedMotion)}
            title={resultCopy.title}
            subtitle={resultCopy.subtitle}
          />
          {isNewHighScore && (
            <CompactHighScore
              label={t('common.game_over_screen.new_high_score') as string}
            />
          )}
          <LiquidationResult
            finalPnl={finalPnl}
            level={level}
            survivalTime={formatTime(survivalTime)}
            kills={kills}
            maxStreak={maxStreak}
            isRetro={isRetro}
            runPerformance={runPerformance}
          />
          <LiquidationReward
            coinCalc={coinCalc}
            settlement={rewardSettlement}
            isRetro={isRetro}
            expanded={showBreakdown}
            onToggle={() => setShowBreakdown(previous => !previous)}
          />
          <LiquidationCareer
            games={progress.totalGamesPlayed}
            totalKills={progress.totalKills}
            bestLevel={progress.highestLevel}
          />
        </div>
        <div className="shrink-0 bg-[#090C12] px-4 pb-4 pt-3 sm:px-8 sm:pb-7 sm:pt-4">
          <ThemedButton
            data-testid="liquidation-primary-action"
            intent="primary"
            onClick={onRestart}
            className="min-h-[52px] w-full text-sm font-black uppercase tracking-[0.2em]"
          >
            {t('common.game_over_screen.back_to_menu') as string}
          </ThemedButton>
        </div>
      </m.div>
    </OverlayChrome>
  );
};

const LiquidationHeader: React.FC<{
  isRetro: boolean;
  reducedMotion: boolean;
  title: string;
  subtitle: string;
}> = ({ isRetro, reducedMotion, title, subtitle }) => (
  <header
    className={cn(
      'relative border-b border-t border-white/10 border-t-[#B22222]/55 py-3 sm:py-4',
      isRetro && 'font-retro-pixel'
    )}
  >
    {!isRetro && (
      <svg
        data-testid="liquidation-decline-trace"
        aria-hidden="true"
        viewBox="0 0 320 96"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-y-0 right-0 w-2/3 opacity-35"
      >
        <polyline
          points="0,18 42,24 78,19 114,35 151,31 188,48 224,44 258,64 286,59 320,88"
          fill="none"
          stroke={COLORS.CASINO_RED}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    )}
    <m.h1
      data-testid="liquidation-heading"
      className={cn(
        'relative z-10 text-[clamp(2rem,10vw,4.75rem)] font-black leading-[0.88] tracking-[-0.055em] text-white',
        isRetro && 'font-retro-pixel tracking-normal text-[#FF5A5A]'
      )}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={RESULT_ENTER_TRANSITION}
    >
      {title}
    </m.h1>
    <p className="relative z-10 mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF7777]">
      {subtitle}
    </p>
  </header>
);

const CompactHighScore: React.FC<{ label: string }> = ({ label }) => (
  <div className="mt-3 flex items-center gap-2 border-l-2 border-[#D6B85C] py-1 pl-3 text-[#D6B85C]">
    <IconTrophy className="h-4 w-4 shrink-0" color={HUD_WAR_ROOM.colors.gold} />
    <span className="text-[10px] font-black uppercase tracking-[0.18em]">{label}</span>
  </div>
);

const LiquidationResult: React.FC<{
  finalPnl: number;
  level: number;
  survivalTime: string;
  kills: number;
  maxStreak: number;
  isRetro: boolean;
  runPerformance: RunPerformance | null;
}> = ({ finalPnl, level, survivalTime, kills, maxStreak, isRetro, runPerformance }) => {
  const { t } = useLanguage();

  return (
    <section className={cn('py-4 sm:py-5', isRetro && 'font-retro-pixel')}>
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {t('common.game_over_screen.pnl') as string}
      </span>
      <p
        data-testid="liquidation-pnl"
        className="font-numbers text-[clamp(2rem,9vw,3.75rem)] font-black leading-none tracking-[-0.06em]"
        style={{
          color: finalPnl >= 0 ? COLORS.PUMP_GREEN : HUD_WAR_ROOM.colors.dangerText,
        }}
      >
        {(finalPnl * 100).toFixed(2)}%
      </p>
      <div
        data-testid="liquidation-run-stats"
        className="mt-4 grid grid-cols-4 divide-x divide-white/10 border-y border-white/10"
      >
        <RunMetric label={t('common.level_label') as string} value={`L${level}`} />
        <RunMetric
          label={t('common.game_over_screen.time') as string}
          value={survivalTime}
        />
        <RunMetric
          label={t('common.game_over_screen.kills') as string}
          value={kills.toLocaleString()}
        />
        <RunMetric label="Streak" value={maxStreak.toLocaleString()} />
      </div>

      <RunPerformanceSummary performance={runPerformance} />
    </section>
  );
};

const formatSignedPercent = (value: number): string =>
  `${value >= 0 ? '+' : ''}${(value * 100).toFixed(0)}%`;

/**
 * Contract §17 closes a run by explaining it: how the trade actually went and
 * how the build performed. Direction reads the time-weighted alignment, not the
 * exit tick, so one lucky final candle cannot rewrite the verdict.
 */
const RunPerformanceSummary: React.FC<{
  performance: RunPerformance | null;
}> = ({ performance }) => {
  const { t } = useLanguage();
  if (performance === null) return null;

  const alignment = performance.timeWeightedAlignment;
  const tradeVerdictKey =
    alignment > 0.15
      ? 'common.game_over_screen.trade_favorable'
      : alignment < -0.15
        ? 'common.game_over_screen.trade_adverse'
        : 'common.game_over_screen.trade_neutral';

  return (
    <div
      data-testid="run-performance-summary"
      className="mt-3 grid grid-cols-2 divide-x divide-white/10"
    >
      <RunMetric
        label={t('common.game_over_screen.trade_accuracy') as string}
        value={`${t(tradeVerdictKey) as string} ${formatSignedPercent(alignment)}`}
      />
      <RunMetric
        label={t('common.game_over_screen.build_performance') as string}
        value={`${(performance.combatMastery * 100).toFixed(0)}%`}
      />
    </div>
  );
};

const RunMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0 px-2 py-3 text-center first:pl-0 last:pr-0 sm:px-4">
    <p className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
      {label}
    </p>
    <p className="font-numbers truncate text-sm font-black text-white sm:text-lg">
      {value}
    </p>
  </div>
);

const LiquidationReward: React.FC<{
  coinCalc: RewardCalculation;
  settlement: RewardSettlement;
  isRetro: boolean;
  expanded: boolean;
  onToggle: () => void;
}> = ({ coinCalc, settlement, isRetro, expanded, onToggle }) => {
  const { t } = useLanguage();

  return (
    <section
      data-testid="liquidation-reward"
      className="border-l-2 border-[#D6B85C]/70 py-2 pl-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {settlement.status === 'verified'
              ? (t('common.game_over_screen.coins_earned') as string)
              : 'REWARD STATUS'}
          </p>
          <p
            data-testid="liquidation-reward-value"
            className={cn(
              'font-numbers text-2xl font-black leading-none sm:text-3xl',
              isRetro && 'font-retro-pixel'
            )}
            style={{ color: HUD_WAR_ROOM.colors.gold }}
          >
            {settlement.status === 'pending'
              ? 'VERIFYING…'
              : settlement.status === 'verified'
                ? `+${settlement.amount.toLocaleString('en-US')}`
                : 'NOT CREDITED'}
          </p>
          <p className="mt-1 text-[10px] leading-snug text-slate-400">
            {settlement.message}
          </p>
        </div>
        {settlement.status === 'verified' && (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={onToggle}
            className="min-h-11 shrink-0 px-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400 underline decoration-slate-600 underline-offset-4"
          >
            {expanded ? 'Hide' : 'Details'}
          </button>
        )}
      </div>

      {settlement.status === 'verified' && expanded && (
        <div
          data-testid="liquidation-reward-breakdown"
          className="mt-2 space-y-1 border-t border-white/10 pt-2"
        >
          {Object.entries(coinCalc.breakdown).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-3 text-xs">
              <span className="truncate uppercase tracking-[0.12em] text-slate-500">
                {key}
              </span>
              <span
                className={cn(
                  'shrink-0 font-numbers font-bold',
                  isRetro && 'font-retro-pixel'
                )}
                style={{ color: value > 0 ? COLORS.PUMP_GREEN : '#64748b' }}
              >
                +{value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const LiquidationCareer: React.FC<{
  games: number;
  totalKills: number;
  bestLevel: number;
}> = ({ games, totalKills, bestLevel }) => {
  const { t } = useLanguage();

  return (
    <section
      data-testid="liquidation-career"
      className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-t border-white/10 py-3 text-xs"
    >
      <CareerMetric
        label={t('common.game_over_screen.games') as string}
        value={games.toLocaleString()}
      />
      <CareerMetric
        label={t('common.game_over_screen.total_kills') as string}
        value={totalKills.toLocaleString()}
      />
      <CareerMetric
        label={t('common.game_over_screen.best_level') as string}
        value={`L${bestLevel}`}
      />
    </section>
  );
};

const CareerMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <span className="flex items-baseline gap-2">
    <span className="font-numbers font-black text-white">{value}</span>
    <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </span>
  </span>
);
