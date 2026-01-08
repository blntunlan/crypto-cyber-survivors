import React from 'react';
import { useTheme } from '../../contexts/useTheme';
import { BUTTON_VARIANTS } from '../../config/themeVariants';

interface ThemedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  intent?: keyof typeof BUTTON_VARIANTS;
  children: React.ReactNode;
}

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  intent = 'primary',
  children,
  className = '',
  ...props
}) => {
  const { isRetro } = useTheme();
  const variantClass = isRetro ? BUTTON_VARIANTS[intent].retro : BUTTON_VARIANTS[intent].modern;

  return (
    <button className={`${variantClass} ${className}`} {...props}>
      {children}
    </button>
  );
};
