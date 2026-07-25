import React from 'react';
import { cn } from '../../utils/classnames';
import { ThemedText } from '../themed/ThemedText';

export type ScreenHeaderProps = React.HTMLAttributes<HTMLElement> & {
  actions?: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
};

export function ScreenHeader({
  actions,
  className,
  description,
  eyebrow,
  title,
  ...props
}: ScreenHeaderProps): React.JSX.Element {
  return (
    <header
      {...props}
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
      data-ui-component="screen-header"
    >
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow && (
          <ThemedText as="p" variant="mono">
            {eyebrow}
          </ThemedText>
        )}
        <ThemedText as="h1" variant="h1">
          {title}
        </ThemedText>
        {description && <ThemedText as="p">{description}</ThemedText>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
