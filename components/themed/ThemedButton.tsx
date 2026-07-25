import React from 'react';
import {
  type UiButtonIntent,
  type UiButtonSize,
} from '../../config/ui/componentVariants';
import { cn } from '../../utils/classnames';
import { useUiSkin } from './useUiSkin';

export type ThemedButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  intent?: UiButtonIntent;
  size?: UiButtonSize;
  children: React.ReactNode;
  loading?: boolean;
  selected?: boolean;
};

export function ThemedButton({
  intent = 'primary',
  size = 'md',
  children,
  className,
  loading = false,
  selected = false,
  disabled,
  ...props
}: ThemedButtonProps): React.JSX.Element {
  const skin = useUiSkin();

  return (
    <button
      {...props}
      className={cn(
        skin.button.base,
        skin.button.size[size],
        skin.button.intent[intent],
        selected && skin.button.selected,
        className
      )}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      data-ui-component="button"
      data-ui-intent={intent}
      data-ui-size={size}
      data-ui-selected={selected || undefined}
    >
      {children}
    </button>
  );
}
