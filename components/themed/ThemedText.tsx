import React from 'react';
import { useTheme } from '../../contexts/useTheme';
import { TEXT_VARIANTS } from '../../config/themeVariants';

interface ThemedTextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: keyof typeof TEXT_VARIANTS;
  as?: React.ElementType;
  children: React.ReactNode;
}

export const ThemedText: React.FC<ThemedTextProps> = ({
  variant = 'body',
  as: Component = 'p',
  children,
  className = '',
  ...props
}) => {
  const { isRetro } = useTheme();
  const variantClass = isRetro ? TEXT_VARIANTS[variant].retro : TEXT_VARIANTS[variant].modern;

  return (
    <Component className={`${variantClass} ${className}`} {...props}>
      {children}
    </Component>
  );
};
