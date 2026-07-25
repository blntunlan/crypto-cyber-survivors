import React from 'react';
import { cn } from '../../utils/classnames';

export type ActionBarAlignment = 'between' | 'end' | 'start';

export type ActionBarProps = React.HTMLAttributes<HTMLDivElement> & {
  align?: ActionBarAlignment;
  children: React.ReactNode;
};

const ALIGNMENT_CLASSES: Record<ActionBarAlignment, string> = {
  between: 'justify-between',
  end: 'justify-end',
  start: 'justify-start',
};

export function ActionBar({
  align = 'end',
  children,
  className,
  ...props
}: ActionBarProps): React.JSX.Element {
  return (
    <div
      {...props}
      className={cn(
        'flex flex-wrap items-center gap-3',
        ALIGNMENT_CLASSES[align],
        className
      )}
      data-ui-component="action-bar"
      data-ui-align={align}
    >
      {children}
    </div>
  );
}
