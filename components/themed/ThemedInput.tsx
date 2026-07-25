import React from 'react';
import { cn } from '../../utils/classnames';
import { useUiSkin } from './useUiSkin';

type ThemedInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const ThemedInput: React.FC<ThemedInputProps> = ({ className, ...props }) => {
  const skin = useUiSkin();

  return (
    <input
      {...props}
      className={cn(skin.control.base, skin.control.input, className)}
      data-ui-component="input"
    />
  );
};
