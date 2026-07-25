import React from 'react';
import { type UiBadgeTone } from '../../config/ui/componentVariants';
import { cn } from '../../utils/classnames';
import { useUiSkin } from './useUiSkin';

export type ThemedBadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  children: React.ReactNode;
  tone?: UiBadgeTone;
};

export function ThemedBadge({
  children,
  className,
  tone = 'neutral',
  ...props
}: ThemedBadgeProps): React.JSX.Element {
  const skin = useUiSkin();

  return (
    <span
      {...props}
      className={cn(skin.badge.base, skin.badge.tone[tone], className)}
      data-ui-component="badge"
      data-ui-tone={tone}
    >
      {children}
    </span>
  );
}
