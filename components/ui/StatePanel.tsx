import React from 'react';
import { type UiBadgeTone } from '../../config/ui/componentVariants';
import { cn } from '../../utils/classnames';
import { ThemedBadge } from '../themed/ThemedBadge';
import { ThemedPanel } from '../themed/ThemedPanel';
import { ThemedText } from '../themed/ThemedText';

export type StatePanelState = 'empty' | 'error' | 'loading';

export type StatePanelProps = {
  action?: React.ReactNode;
  className?: string;
  description?: React.ReactNode;
  state: StatePanelState;
  title: React.ReactNode;
};

const STATE_TONES: Record<StatePanelState, UiBadgeTone> = {
  empty: 'neutral',
  error: 'danger',
  loading: 'warning',
};

export function StatePanel({
  action,
  className,
  description,
  state,
  title,
}: StatePanelProps): React.JSX.Element {
  return (
    <ThemedPanel
      surface="raised"
      padding="lg"
      role={state === 'error' ? 'alert' : 'status'}
      className={cn('flex flex-col items-center gap-4 text-center', className)}
      data-ui-component="state-panel"
      data-ui-state={state}
    >
      <ThemedBadge tone={STATE_TONES[state]}>{state}</ThemedBadge>
      <ThemedText as="h2" variant="h2">
        {title}
      </ThemedText>
      {description && <ThemedText as="p">{description}</ThemedText>}
      {action}
    </ThemedPanel>
  );
}
