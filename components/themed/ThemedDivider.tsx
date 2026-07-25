import React from 'react';
import { cn } from '../../utils/classnames';
import { useUiSkin } from './useUiSkin';

export type ThemedDividerProps = React.HTMLAttributes<HTMLDivElement> & {
  label?: string;
};

export function ThemedDivider({
  className,
  label,
  ...props
}: ThemedDividerProps): React.JSX.Element {
  const skin = useUiSkin();

  if (!label) {
    return (
      <div
        {...props}
        role="separator"
        className={cn(skin.divider, className)}
        data-ui-component="divider"
      />
    );
  }

  return (
    <div
      {...props}
      role="separator"
      aria-label={label}
      className={cn('flex items-center gap-3', className)}
      data-ui-component="divider"
    >
      <span className={skin.divider} />
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--ui-text-muted)]">
        {label}
      </span>
      <span className={skin.divider} />
    </div>
  );
}
