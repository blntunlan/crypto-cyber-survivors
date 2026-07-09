import { type CSSProperties, type ReactNode } from 'react';
import { HUD_WAR_ROOM, type HudRailTone } from '../../config/HUDWarRoom';
import { cn } from '../../utils/classnames';

export type HudGhostRailProps = {
  children: ReactNode;
  side: 'left' | 'right' | 'center';
  tone?: HudRailTone;
  className?: string;
  testId?: string;
  style?: CSSProperties;
};

export type HudEventRailProps = {
  children: ReactNode;
  tone?: HudRailTone;
  className?: string;
  testId?: string;
};

export type { HudRailTone } from '../../config/HUDWarRoom';

const toneColors: Record<HudRailTone, string> = {
  gold: HUD_WAR_ROOM.colors.gold,
  danger: HUD_WAR_ROOM.colors.crimson,
  positive: HUD_WAR_ROOM.colors.mint,
  neutral: HUD_WAR_ROOM.colors.muted,
};

const sideClasses: Record<HudGhostRailProps['side'], string> = {
  left: 'border-l-2 pl-2 text-left',
  right: 'border-r-2 pr-2 text-right',
  center: 'px-2 text-center',
};

export function HudGhostRail({
  children,
  side,
  tone = 'neutral',
  className,
  testId,
  style,
}: HudGhostRailProps): React.JSX.Element {
  return (
    <div
      className={cn('text-shadow-war-room', sideClasses[side], className)}
      data-hud-side={side}
      data-hud-tone={tone}
      data-testid={testId}
      style={{
        ...style,
        borderColor: toneColors[tone],
        textShadow: HUD_WAR_ROOM.textShadow,
      }}
    >
      {children}
    </div>
  );
}

export function HudEventRail({
  children,
  tone = 'neutral',
  className,
  testId = 'hud-event-rail',
}: HudEventRailProps): React.JSX.Element {
  return (
    <div
      className={cn('border-l-2 pl-2 text-shadow-war-room', className)}
      data-hud-tone={tone}
      data-testid={testId}
      style={{ borderColor: toneColors[tone], textShadow: HUD_WAR_ROOM.textShadow }}
    >
      {children}
    </div>
  );
}
