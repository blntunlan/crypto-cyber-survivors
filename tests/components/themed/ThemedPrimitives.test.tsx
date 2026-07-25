import { Crosshair } from 'lucide-react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { ThemedBadge } from '../../../components/themed/ThemedBadge';
import { ThemedButton } from '../../../components/themed/ThemedButton';
import { ThemedDivider } from '../../../components/themed/ThemedDivider';
import { ThemedIconButton } from '../../../components/themed/ThemedIconButton';
import { ThemedSelect } from '../../../components/themed/ThemedSelect';
import { ThemedSelectionCard } from '../../../components/themed/ThemedSelectionCard';
import { ThemedTextarea } from '../../../components/themed/ThemedTextarea';

describe('themed primitives', () => {
  test('renders typed button and icon-button variants with accessible states', () => {
    render(
      <ThemeProvider>
        <ThemedButton intent="danger" size="lg">
          Abandon run
        </ThemedButton>
        <ThemedIconButton aria-label="Open crosshair settings" intent="secondary">
          <Crosshair />
        </ThemedIconButton>
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: 'Abandon run' });
    const iconButton = screen.getByRole('button', {
      name: 'Open crosshair settings',
    });

    expect(button).toHaveAttribute('data-ui-component', 'button');
    expect(button).toHaveAttribute('data-ui-intent', 'danger');
    expect(button).toHaveAttribute('data-ui-size', 'lg');
    expect(iconButton).toHaveAttribute('data-ui-component', 'icon-button');
    expect(iconButton.className).toContain('min-h-[44px]');
  });

  test('renders form controls with a shared semantic control contract', () => {
    render(
      <ThemeProvider>
        <label htmlFor="run-note">Run note</label>
        <ThemedTextarea id="run-note" aria-describedby="run-note-help" />
        <span id="run-note-help">Visible after game over.</span>

        <label htmlFor="risk-level">Risk level</label>
        <ThemedSelect id="risk-level" defaultValue="medium">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
        </ThemedSelect>
      </ThemeProvider>
    );

    expect(screen.getByLabelText('Run note')).toHaveAttribute(
      'data-ui-component',
      'textarea'
    );
    expect(screen.getByLabelText('Risk level')).toHaveAttribute(
      'data-ui-component',
      'select'
    );
  });

  test('renders non-interactive primitives with semantic metadata', () => {
    render(
      <ThemeProvider>
        <ThemedBadge tone="success">Market stable</ThemedBadge>
        <ThemedDivider label="Run details" />
      </ThemeProvider>
    );

    expect(screen.getByText('Market stable')).toHaveAttribute(
      'data-ui-component',
      'badge'
    );
    expect(screen.getByRole('separator', { name: 'Run details' })).toHaveAttribute(
      'data-ui-component',
      'divider'
    );
  });

  test('renders selected cards with a pressed state and a 44px target', () => {
    render(
      <ThemeProvider>
        <ThemedSelectionCard accentColor="#22d3ee" selected tone="success">
          Long position
        </ThemedSelectionCard>
        <ThemedSelectionCard disabled>Unavailable</ThemedSelectionCard>
      </ThemeProvider>
    );

    const selectedCard = screen.getByRole('button', { name: 'Long position' });
    const disabledCard = screen.getByRole('button', { name: 'Unavailable' });

    expect(selectedCard).toHaveAttribute('aria-pressed', 'true');
    expect(selectedCard).toHaveAttribute('data-ui-component', 'selection-card');
    expect(selectedCard.className).toContain('min-h-14');
    expect(disabledCard).toBeDisabled();
  });

  test('aligns compact selection cards consistently across themes', () => {
    localStorage.setItem('crypto-survivor-theme', 'cyberpunk');
    const cyberpunkRender = render(
      <ThemeProvider>
        <ThemedSelectionCard size="compact">Cyberpunk</ThemedSelectionCard>
      </ThemeProvider>
    );

    const cyberpunkCard = screen.getByRole('button', { name: 'Cyberpunk' });
    expect(cyberpunkCard.className).toContain('items-center');
    expect(cyberpunkCard.className).toContain('justify-center');
    expect(cyberpunkCard.className).toContain('leading-none');
    cyberpunkRender.unmount();

    localStorage.setItem('crypto-survivor-theme', 'retro-16bit');
    render(
      <ThemeProvider>
        <ThemedSelectionCard size="compact">Retro</ThemedSelectionCard>
      </ThemeProvider>
    );

    const retroCard = screen.getByRole('button', { name: 'Retro' });
    expect(retroCard.className).toContain('items-center');
    expect(retroCard.className).toContain('justify-center');
    expect(retroCard.className).toContain('leading-none');
  });

  test('renders leverage cards with an accent-driven visual variant', () => {
    render(
      <ThemeProvider>
        <ThemedSelectionCard accentColor="#facc15" selected variant="leverage">
          10x
        </ThemedSelectionCard>
      </ThemeProvider>
    );

    const leverageCard = screen.getByRole('button', { name: '10x' });

    expect(leverageCard).toHaveAttribute('data-ui-variant', 'leverage');
    expect(leverageCard.className).toContain('var(--ui-selection-accent)');
  });

  test('renders asset cards with accent-driven visual variants across themes', () => {
    localStorage.setItem('crypto-survivor-theme', 'cyberpunk');
    const cyberpunkRender = render(
      <ThemeProvider>
        <ThemedSelectionCard accentColor="#f7931a" selected variant="asset">
          Cyberpunk asset
        </ThemedSelectionCard>
      </ThemeProvider>
    );

    const cyberpunkCard = screen.getByRole('button', { name: 'Cyberpunk asset' });
    expect(cyberpunkCard).toHaveAttribute('data-ui-variant', 'asset');
    expect(cyberpunkCard.className).toContain('var(--ui-selection-accent)');
    cyberpunkRender.unmount();

    localStorage.setItem('crypto-survivor-theme', 'retro-16bit');
    render(
      <ThemeProvider>
        <ThemedSelectionCard accentColor="#627eea" selected variant="asset">
          Retro asset
        </ThemedSelectionCard>
      </ThemeProvider>
    );

    const retroCard = screen.getByRole('button', { name: 'Retro asset' });
    expect(retroCard).toHaveAttribute('data-ui-variant', 'asset');
    expect(retroCard.className).toContain('var(--ui-selection-accent)');
  });
  test('renders position cards with accent-driven visual variants across themes', () => {
    localStorage.setItem('crypto-survivor-theme', 'cyberpunk');
    const cyberpunkRender = render(
      <ThemeProvider>
        <ThemedSelectionCard accentColor="#4ade80" variant="position">
          Cyberpunk position
        </ThemedSelectionCard>
      </ThemeProvider>
    );

    expect(
      screen.getByRole('button', { name: 'Cyberpunk position' }).className
    ).toContain('var(--ui-selection-accent)');
    cyberpunkRender.unmount();

    localStorage.setItem('crypto-survivor-theme', 'retro-16bit');
    render(
      <ThemeProvider>
        <ThemedSelectionCard accentColor="#ff3d00" variant="position">
          Retro position
        </ThemedSelectionCard>
      </ThemeProvider>
    );

    expect(screen.getByRole('button', { name: 'Retro position' }).className).toContain(
      'var(--ui-selection-accent)'
    );
  });
});
