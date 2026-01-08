import { render, screen, fireEvent } from '../test-utils';
import { describe, it, expect, vi } from 'vitest';
import { PauseMenu } from '../../components/screens/PauseMenu';

describe('PauseMenu', () => {
  const mockStats = {
    totalKills: 10,
    maxStreak: 5,
    totalBonusXp: 100,
  };

  it('should render stats correctly', () => {
    render(
      <PauseMenu
        sessionStartTime={Date.now() - 60000}
        runStats={mockStats}
        onResume={() => {}}
        onRestart={() => {}}
        onMainMenu={() => {}}
        onOpenSettings={() => {}}
        isMuted={false}
        onToggleMute={() => {}}
      />
    );
    expect(screen.getByText('10')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('100')).toBeDefined();
    expect(screen.getByText(/1:00/)).toBeDefined();
  });

  it('should call onResume when Resume button is clicked', () => {
    const onResume = vi.fn();
    render(
      <PauseMenu
        sessionStartTime={Date.now()}
        runStats={mockStats}
        onResume={onResume}
        onRestart={() => {}}
        onMainMenu={() => {}}
        onOpenSettings={() => {}}
        isMuted={false}
        onToggleMute={() => {}}
      />
    );
    fireEvent.click(screen.getByText(/Resume/i));
    expect(onResume).toHaveBeenCalled();
  });

  it('should call onRestart when Restart button is clicked', () => {
    const onRestart = vi.fn();
    render(
      <PauseMenu
        sessionStartTime={Date.now()}
        runStats={mockStats}
        onResume={() => {}}
        onRestart={onRestart}
        onMainMenu={() => {}}
        onOpenSettings={() => {}}
        isMuted={false}
        onToggleMute={() => {}}
      />
    );
    fireEvent.click(screen.getByText(/Restart/i));
    expect(onRestart).toHaveBeenCalled();
  });
});
