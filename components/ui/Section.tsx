import React, { useId } from 'react';
import { cn } from '../../utils/classnames';
import { ThemedText } from '../themed/ThemedText';

export type SectionProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
  description?: React.ReactNode;
  title?: React.ReactNode;
};

export function Section({
  children,
  className,
  description,
  title,
  ...props
}: SectionProps): React.JSX.Element {
  const titleId = useId();

  return (
    <section
      {...props}
      aria-labelledby={title != null ? titleId : undefined}
      className={cn('flex flex-col gap-4', className)}
      data-ui-component="section"
    >
      {(title != null || description != null) && (
        <header className="flex flex-col gap-1">
          {title != null && (
            <ThemedText as="h2" id={titleId} variant="h2">
              {title}
            </ThemedText>
          )}
          {description != null && <ThemedText as="p">{description}</ThemedText>}
        </header>
      )}
      {children}
    </section>
  );
}
