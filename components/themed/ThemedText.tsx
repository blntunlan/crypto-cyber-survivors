import React from 'react';
import { type UiTextVariant } from '../../config/ui/componentVariants';
import { cn } from '../../utils/classnames';
import { useUiSkin } from './useUiSkin';

export type ThemedTextProps = React.HTMLAttributes<HTMLElement> & {
  variant?: UiTextVariant;
  as?: React.ElementType;
  children: React.ReactNode;
};

export function ThemedText({
  variant = 'body',
  as: Component = 'p',
  children,
  className,
  ...props
}: ThemedTextProps): React.JSX.Element {
  const skin = useUiSkin();

  return (
    <Component
      {...props}
      className={cn(skin.text[variant], className)}
      data-ui-component="text"
      data-ui-variant={variant}
    >
      {children}
    </Component>
  );
}
