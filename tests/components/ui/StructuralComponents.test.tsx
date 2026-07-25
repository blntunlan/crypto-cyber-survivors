import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { ActionBar } from '../../../components/ui/ActionBar';
import { PageShell } from '../../../components/ui/PageShell';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Section } from '../../../components/ui/Section';
import { StatePanel } from '../../../components/ui/StatePanel';
import { ThemedButton } from '../../../components/themed/ThemedButton';

describe('structural UI components', () => {
  test('composes a screen from shell, header, section and action bar', () => {
    render(
      <ThemeProvider>
        <PageShell width="narrow">
          <ScreenHeader eyebrow="Run control" title="Prepare position" />
          <Section title="Position">
            <p>Long BTC</p>
          </Section>
          <ActionBar>
            <ThemedButton intent="primary">Start run</ThemedButton>
          </ActionBar>
        </PageShell>
      </ThemeProvider>
    );

    expect(screen.getByRole('main')).toHaveAttribute('data-ui-component', 'page-shell');
    expect(screen.getByRole('heading', { name: 'Prepare position' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Position' })).toHaveAttribute(
      'data-ui-component',
      'section'
    );
    expect(screen.getByText('Start run').parentElement).toHaveAttribute(
      'data-ui-component',
      'action-bar'
    );
  });

  test('renders an accessible recovery action for error state', () => {
    render(
      <ThemeProvider>
        <StatePanel
          state="error"
          title="Market feed unavailable"
          description="Reconnect to continue."
          action={<ThemedButton intent="primary">Reconnect</ThemedButton>}
        />
      </ThemeProvider>
    );

    expect(screen.getByRole('alert')).toHaveAttribute(
      'data-ui-component',
      'state-panel'
    );
    expect(screen.getByRole('button', { name: 'Reconnect' })).toBeVisible();
  });
});
