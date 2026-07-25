import React from 'react';
import {
  type UiPanelPadding,
  type UiPanelSurface,
} from '../../config/ui/componentVariants';
import { cn } from '../../utils/classnames';
import { useUiSkin } from './useUiSkin';

export type ThemedPanelProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  'data-ui-component'?: string;
  padding?: UiPanelPadding;
  surface?: UiPanelSurface;
};

export function ThemedPanel({
  children,
  className,
  padding = 'none',
  surface = 'default',
  'data-ui-component': componentName,
  ...props
}: ThemedPanelProps): React.JSX.Element {
  const skin = useUiSkin();

  return (
    <div
      {...props}
      className={cn(
        skin.panel.base,
        skin.panel.surface[surface],
        skin.panel.padding[padding],
        className
      )}
      data-ui-component={componentName ?? 'panel'}
      data-ui-padding={padding}
      data-ui-surface={surface}
    >
      {children}
    </div>
  );
}
