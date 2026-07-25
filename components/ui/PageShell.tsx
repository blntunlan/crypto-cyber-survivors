import React from 'react';
import { PAGE_SHELL_WIDTHS, type PageShellWidth } from '../../config/ui/layout';
import { cn } from '../../utils/classnames';

export type PageShellProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
  width?: PageShellWidth;
};

export function PageShell({
  children,
  className,
  width = 'standard',
  ...props
}: PageShellProps): React.JSX.Element {
  return (
    <main
      {...props}
      className={cn(
        'allow-scroll h-full overflow-y-auto px-4 py-6 sm:px-6 sm:py-8',
        className
      )}
      data-ui-component="page-shell"
      data-ui-width={width}
    >
      <div
        className={cn('mx-auto flex w-full flex-col gap-6', PAGE_SHELL_WIDTHS[width])}
      >
        {children}
      </div>
    </main>
  );
}
