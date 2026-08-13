import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RunPressureIndicator } from '../../../components/hud/RunPressureIndicator';
import { EventBus } from '../../../services/core/EventBus';

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../contexts/useTheme', () => ({
  useIsRetro: () => false,
  useTheme: () => ({ isRetro: false }),
}));

describe('RunPressureIndicator', () => {
  beforeEach(() => {
    EventBus.emit('gameReset', {});
  });

  it('stays hidden while the run has no Doom or Greed', () => {
    render(<RunPressureIndicator />);

    expect(screen.queryByTestId('run-pressure-indicator')).not.toBeInTheDocument();
  });

  it('shows the greed tier and level once greed escalates', () => {
    render(<RunPressureIndicator />);

    act(() => {
      EventBus.emit('directorProgressionChanged', {
        doomStacks: 0,
        greedLevel: 2,
        supportEfficiency: 1,
      });
    });

    expect(screen.getByTestId('run-pressure-greed')).toHaveTextContent(
      'hud.greed_greed'
    );
    expect(screen.getByTestId('run-pressure-greed')).toHaveTextContent('2');
    expect(screen.queryByTestId('run-pressure-doom')).not.toBeInTheDocument();
  });

  it('shows Doom stacks and the reduced support efficiency', () => {
    render(<RunPressureIndicator />);

    act(() => {
      EventBus.emit('directorProgressionChanged', {
        doomStacks: 3,
        greedLevel: 0,
        supportEfficiency: 0.7,
      });
    });

    expect(screen.getByTestId('run-pressure-doom')).toHaveTextContent('hud.doom_stack');
    expect(screen.getByTestId('run-pressure-doom')).toHaveTextContent('3');
    expect(screen.getByTestId('run-pressure-support')).toHaveTextContent('70%');
  });

  it('caps the greed tier label at the highest published tier', () => {
    render(<RunPressureIndicator />);

    act(() => {
      EventBus.emit('directorProgressionChanged', {
        doomStacks: 0,
        greedLevel: 12,
        supportEfficiency: 1,
      });
    });

    expect(screen.getByTestId('run-pressure-greed')).toHaveTextContent(
      'hud.greed_doom'
    );
    expect(screen.getByTestId('run-pressure-greed')).toHaveTextContent('12');
  });

  it('clears itself when the run resets', () => {
    render(<RunPressureIndicator />);

    act(() => {
      EventBus.emit('directorProgressionChanged', {
        doomStacks: 2,
        greedLevel: 1,
        supportEfficiency: 0.8,
      });
    });
    expect(screen.getByTestId('run-pressure-indicator')).toBeInTheDocument();

    act(() => {
      EventBus.emit('gameReset', {});
    });

    expect(screen.queryByTestId('run-pressure-indicator')).not.toBeInTheDocument();
  });
});
