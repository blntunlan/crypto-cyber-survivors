import React from 'react';
import { cn } from '../../utils/classnames';
import { useUiSkin } from './useUiSkin';

export type ThemedTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function ThemedTextarea({
  className,
  ...props
}: ThemedTextareaProps): React.JSX.Element {
  const skin = useUiSkin();

  return (
    <textarea
      {...props}
      className={cn(skin.control.base, skin.control.textarea, className)}
      data-ui-component="textarea"
    />
  );
}
