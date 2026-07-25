import React from 'react';
import { type UiButtonIntent } from '../../config/ui/componentVariants';
import { cn } from '../../utils/classnames';
import { useUiSkin } from './useUiSkin';

export type ThemedIconButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> & {
  'aria-label': string;
  children: React.ReactNode;
  intent?: UiButtonIntent;
  loading?: boolean;
};

export function ThemedIconButton({
  children,
  className,
  disabled,
  intent = 'ghost',
  loading = false,
  ...props
}: ThemedIconButtonProps): React.JSX.Element {
  const skin = useUiSkin();

  return (
    <button
      {...props}
      className={cn(skin.iconButton.base, skin.iconButton.intent[intent], className)}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      data-ui-component="icon-button"
      data-ui-intent={intent}
    >
      {children}
    </button>
  );
}
