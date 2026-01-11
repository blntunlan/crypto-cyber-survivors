import React from 'react';
import { useTheme } from '../../contexts/useTheme';
import { PANEL_VARIANTS } from '../../config/themeVariants';

interface ThemedPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const ThemedPanel: React.FC<ThemedPanelProps> = ({
  children,
  className = '',
  ...props
}) => {
  const { isRetro } = useTheme();
  const variantClass = isRetro ? PANEL_VARIANTS.retro : PANEL_VARIANTS.modern;

  return (
    <div className={`${variantClass} ${className}`} {...props}>
      {children}
    </div>
  );
};
