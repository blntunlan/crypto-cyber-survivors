import React, { memo, useEffect, useState } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';
import { COLORS } from '../../constants';
import { MILESTONE_ANNOUNCEMENT } from '../../config/MilestoneConfig';
import { screenService } from '../../services/system/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { useIsRetro } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import { type ActiveAnnouncement } from '../../hooks/useHUDEvents';

interface MilestoneAnnouncerProps {
  announcement: ActiveAnnouncement | null;
  /** Per-element scale from UILayout (milestoneAnnouncer.scale) */
  scale?: number;
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

/**
 * Resolve the display label: prefer the locale entry, fall back to the
 * resolved English name when the key is missing (t returns the key itself).
 */
function resolveLabel(t: Translate, announcement: ActiveAnnouncement): string {
  if (announcement.nameKey) {
    const translated = t(announcement.nameKey, announcement.nameParams);
    if (translated !== announcement.nameKey) return translated;
  }
  return announcement.name;
}

function badgeKey(kind: ActiveAnnouncement['kind']): string {
  switch (kind) {
    case 'combo':
      return 'hud.xp_multiplier_up';
    case 'danger':
      return 'milestones.danger_badge';
    default:
      return 'milestones.milestone_badge';
  }
}

function displaySeconds(kind: ActiveAnnouncement['kind']): number {
  return (
    (kind === 'combo'
      ? MILESTONE_ANNOUNCEMENT.COMBO_DISPLAY_MS
      : MILESTONE_ANNOUNCEMENT.DISPLAY_MS) / 1000
  );
}

/**
 * DangerOverlay - Screen-edge red pulse behind danger announcements.
 * Pre-rendered gradient animated with opacity only (GPU-cheap).
 */
const DangerOverlay: React.FC = () => (
  <div
    className="pointer-events-none fixed inset-0 z-[124]"
    style={{
      background: `radial-gradient(ellipse at center, transparent 55%, ${COLORS.SHORT}59 100%)`,
      animation: 'dangerEdgePulse 0.9s ease-in-out 2',
      willChange: 'opacity',
    }}
  />
);

/**
 * DesktopAnnouncer - Uses CSS animations for a grand, stable feel on larger screens.
 */
const DesktopAnnouncer: React.FC<MilestoneAnnouncerProps & { isRetro: boolean }> = ({
  announcement,
  scale = 1,
  isRetro,
}) => {
  const { t } = useLanguage();
  const { rfs } = useResponsiveUI();
  if (!announcement) return null;

  const { color, kind, icon } = announcement;
  const isDanger = kind === 'danger';
  const label = resolveLabel(t, announcement);
  const badgeColor = isDanger ? COLORS.DUMP_ORANGE : COLORS.JACKPOT_YELLOW;
  const badgeBorder = isDanger ? COLORS.CASINO_RED : COLORS.CASINO_GOLD;
  const outDelay = displaySeconds(kind) - 0.25;

  return (
    <React.Fragment key={announcement.seq}>
      {isDanger && <DangerOverlay />}
      <div
        className="pointer-events-none fixed left-1/2 z-[125] flex -translate-x-1/2 flex-col items-center"
        style={{
          top: 'calc(14rem + env(safe-area-inset-top, 0px))',
          animation: `milestoneIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards, milestoneOut 0.25s ease-in ${outDelay}s forwards`,
        }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
          <div
            className="whitespace-nowrap text-center font-black uppercase italic tracking-tighter"
            style={{
              color: 'white',
              fontSize: rfs(60),
              textShadow: isRetro
                ? '6px 6px 0 #000'
                : `3px 3px 0 #000, 0 0 15px ${color}`,
            }}
          >
            {kind !== 'combo' && icon ? `${icon} ${label}` : label}
          </div>

          <div className="relative mt-3 flex items-center justify-center">
            <div
              className={`relative flex items-center justify-center overflow-visible border-4 px-8 py-2 font-black italic ${
                isRetro
                  ? 'rounded-none border-double border-white shadow-[4px_4px_0_#000]'
                  : 'rounded-sm backdrop-blur-md'
              }`}
              style={{
                color: badgeColor,
                borderColor: isRetro ? '#FFFFFF' : badgeBorder,
                backgroundColor: isRetro ? COLORS.SLOT_BLACK : `${COLORS.SLOT_BLACK}CC`,
                boxShadow: isRetro ? '8px 8px 0 #000' : `0 0 25px ${color}50`,
              }}
            >
              {/* Retro Corner Accents */}
              {isRetro && (
                <>
                  <div
                    className="absolute -left-1 -top-1 h-2 w-2"
                    style={{ backgroundColor: badgeColor }}
                  />
                  <div
                    className="absolute -bottom-1 -right-1 h-2 w-2"
                    style={{ backgroundColor: badgeColor }}
                  />
                </>
              )}

              <span className="relative z-10 text-xl tracking-widest">
                {t(badgeKey(kind))}
              </span>

              {!isRetro && (
                <div
                  className="absolute left-1/2 top-1/2 -z-10"
                  style={{
                    width: '170%',
                    height: '320%',
                    transform: 'translate(-50%, -50%)',
                    filter: 'blur(8px)',
                    // Radial gradient that fades to transparent → soft halo instead
                    // of a blurred rectangle (a solid bg + small blur reads as a box).
                    background: `radial-gradient(ellipse at center, ${color}99 0%, ${color}40 40%, transparent 70%)`,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

/**
 * MobileAnnouncer - Optimized for touch, using Framer Motion for buttery smooth
 * performance and responsive positioning.
 */
const MobileAnnouncer: React.FC<MilestoneAnnouncerProps & { isRetro: boolean }> = ({
  announcement,
  scale = 1,
  isRetro,
}) => {
  const { t } = useLanguage();
  const { rs, rfs } = useResponsiveUI();

  const isDanger = announcement?.kind === 'danger';
  const badgeColor = isDanger ? COLORS.DUMP_ORANGE : COLORS.JACKPOT_YELLOW;
  const badgeBorder = isDanger ? COLORS.CASINO_RED : COLORS.CASINO_GOLD;

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {announcement && (
          <m.div
            key={announcement.seq}
            className="pointer-events-none fixed left-1/2 z-[125] flex -translate-x-1/2 flex-col items-center"
            initial={{ opacity: 0, y: -20, scale: 0.8 * scale, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.9 * scale, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              top: `calc(${rs(90)}px + env(safe-area-inset-top, 0px))`,
              width: '100vw',
            }}
          >
            {isDanger && <DangerOverlay />}
            <m.div
              className="text-center font-black uppercase italic tracking-tighter"
              style={{
                color: 'white',
                textShadow: isRetro
                  ? '2px 2px 0 #000'
                  : `2px 2px 0 #000, 0 0 10px ${announcement.color}`,
                fontSize: rfs(24),
              }}
            >
              {announcement.kind !== 'combo' && announcement.icon
                ? `${announcement.icon} ${resolveLabel(t, announcement)}`
                : resolveLabel(t, announcement)}
            </m.div>

            <m.div
              className="relative mt-2"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div
                className={`relative flex items-center justify-center font-black italic ${
                  isRetro
                    ? 'rounded-none border-4 border-white shadow-[4px_4px_0_#000]'
                    : 'rounded-lg border-2 backdrop-blur-sm'
                }`}
                style={{
                  color: badgeColor,
                  borderColor: isRetro ? 'white' : badgeBorder,
                  backgroundColor: isRetro
                    ? COLORS.SLOT_BLACK
                    : `${COLORS.SLOT_BLACK}E6`,
                  boxShadow: isRetro
                    ? '4px 4px 0 #000'
                    : `0 0 15px ${announcement.color}40`,
                  fontSize: rfs(12),
                  padding: `${rs(6)}px ${rs(20)}px`,
                }}
              >
                <span className="relative z-10 tracking-tight">
                  {t(badgeKey(announcement.kind))}
                </span>

                {/* Decorative elements for retro */}
                {isRetro && (
                  <div
                    className="absolute -left-1 -top-1 h-2 w-2"
                    style={{ backgroundColor: badgeColor }}
                  />
                )}

                {/* Simplified glow for mobile perf - hidden in retro */}
                {!isRetro && (
                  <div
                    className="absolute -z-10 blur-xl"
                    style={{
                      inset: '-50% -25%',
                      // Radial fade to transparent → soft halo, not a blurry box.
                      background: `radial-gradient(ellipse at center, ${announcement.color}80 0%, transparent 70%)`,
                    }}
                  />
                )}
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
};

/**
 * MilestoneAnnouncer - Adaptive entry point that decides which announcer to show.
 */
export const MilestoneAnnouncer: React.FC<MilestoneAnnouncerProps> = memo(props => {
  const [isMobile, setIsMobile] = useState(() => screenService.isMobile());
  const isRetro = useIsRetro();

  useEffect(() => {
    const unsubscribe = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsubscribe;
  }, []);

  if (isMobile) {
    return <MobileAnnouncer {...props} isRetro={isRetro} />;
  }

  return <DesktopAnnouncer {...props} isRetro={isRetro} />;
});
