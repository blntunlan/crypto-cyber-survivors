import React from 'react';
import {
  type UiSelectionCardSize,
  type UiSelectionCardTone,
  type UiSelectionCardVariant,
} from '../../config/ui/componentVariants';
import { cn } from '../../utils/classnames';
import { useUiSkin } from './useUiSkin';

export type ThemedSelectionCardProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'color'
> & {
  accentColor?: string;
  selected?: boolean;
  size?: UiSelectionCardSize;
  tone?: UiSelectionCardTone;
  variant?: UiSelectionCardVariant;
};

type SelectionCardStyle = React.CSSProperties & {
  '--ui-selection-accent': string;
};

export function ThemedSelectionCard({
  accentColor,
  children,
  className,
  disabled,
  selected = false,
  size = 'default',
  style,
  tone = 'neutral',
  type = 'button',
  variant = 'default',
  ...props
}: ThemedSelectionCardProps): React.JSX.Element {
  const skin = useUiSkin();

  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      aria-pressed={selected}
      data-ui-component="selection-card"
      data-ui-selected={selected}
      data-ui-tone={tone}
      data-ui-variant={variant}
      className={cn(
        skin.selectionCard.base,
        skin.selectionCard.size[size],
        skin.selectionCard.tone[tone],
        skin.selectionCard.variant[variant],
        selected && skin.selectionCard.selected,
        selected && skin.selectionCard.selectedVariant[variant],
        disabled && skin.selectionCard.disabled,
        className
      )}
      style={
        accentColor
          ? ({ ...style, '--ui-selection-accent': accentColor } as SelectionCardStyle)
          : style
      }
    >
      {children}
    </button>
  );
}
