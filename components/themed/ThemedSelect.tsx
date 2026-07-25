import React from 'react';
import { cn } from '../../utils/classnames';
import { useUiSkin } from './useUiSkin';

export type ThemedSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function ThemedSelect({
  className,
  ...props
}: ThemedSelectProps): React.JSX.Element {
  const skin = useUiSkin();

  return (
    <select
      {...props}
      className={cn(skin.control.base, skin.control.select, className)}
      data-ui-component="select"
    />
  );
}
