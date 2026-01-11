import React from 'react';
import { useTheme } from '../../contexts/useTheme';
import { INPUT_VARIANTS } from '../../config/themeVariants';

type ThemedInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const ThemedInput: React.FC<ThemedInputProps> = ({
  className = '',
  ...props
}) => {
  const { isRetro } = useTheme();
  const variantClass = isRetro ? INPUT_VARIANTS.retro : INPUT_VARIANTS.modern;

  return <input className={`${variantClass} ${className}`} {...props} />;
};
