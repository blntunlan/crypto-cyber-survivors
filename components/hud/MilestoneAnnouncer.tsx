import React, { memo, useEffect, useState } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';
import { COLORS } from '../../constants';
import { MILESTONE_ANNOUNCEMENT } from '../../config/MilestoneConfig';
import { screenService } from '../../services/system/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { useIsRetro } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import { type ActiveAnnouncement } from '../../hooks/useHUDEvents';
import { HudEventRail } from './HudGhostRail';

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
            {isRetro ? (
              <div
                className="relative flex items-center justify-center overflow-visible rounded-none border-4 border-double border-white px-8 py-2 font-black italic shadow-[8px_8px_0_#000]"
                style={{ color: badgeColor, backgroundColor: COLORS.SLOT_BLACK }}
              >
                <span className="relative z-10 text-xl tracking-widest">
                  {t(badgeKey(kind))}
                </span>
              </div>
            ) : (
              <HudEventRail
                tone={isDanger ? 'danger' : 'gold'}
                className="px-6 py-1.5 text-xl font-black italic tracking-widest"
              >
                {t(badgeKey(kind))}
              </HudEventRail>
            )}
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
              {isRetro ? (
                <div
                  className="relative flex items-center justify-center rounded-none border-4 border-white font-black italic shadow-[4px_4px_0_#000]"
                  style={{
                    color: badgeColor,
                    backgroundColor: COLORS.SLOT_BLACK,
                    fontSize: rfs(12),
                    padding: `${rs(6)}px ${rs(20)}px`,
                  }}
                >
                  <span className="relative z-10 tracking-tight">
                    {t(badgeKey(announcement.kind))}
                  </span>
                </div>
              ) : (
                <HudEventRail
                  tone={isDanger ? 'danger' : 'gold'}
                  className="px-4 py-1 text-center font-black italic"
                >
                  <span style={{ fontSize: rfs(12) }}>
                    {t(badgeKey(announcement.kind))}
                  </span>
                </HudEventRail>
              )}
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
