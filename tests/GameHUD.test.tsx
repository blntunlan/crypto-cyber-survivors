import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameHUD } from '../components/GameHUD';
import { GameStatus } from '../types';
import { EventBus } from '../services/EventBus';
import { ComboSystem } from '../services/ComboSystem';

// Mock ComboSystem
vi.mock('../services/ComboSystem', () => ({
    ComboSystem: {
        getComboTimeRemaining: vi.fn(() => 1.0)
    }
}));

describe('GameHUD', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        EventBus.clear();
        vi.mocked(ComboSystem.getComboTimeRemaining).mockReturnValue(1.0);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should not render when in MENU status', () => {
        const { container } = render(<GameHUD status={GameStatus.MENU} />);
        expect(container.firstChild).toBeNull();
    });

    it('should render and respond to combo updates', () => {
        render(<GameHUD status={GameStatus.PLAYING} />);

        act(() => {
            EventBus.emit('comboUpdate', { killStreak: 10, multiplier: 1.5 });
        });

        expect(screen.getByText(/10x COMBO/i)).toBeInTheDocument();
        expect(screen.getByText(/x1.5 XP/i)).toBeInTheDocument();
    });

    it('should show milestone text when comboMilestone event is emitted', () => {
        render(<GameHUD status={GameStatus.PLAYING} />);

        act(() => {
            EventBus.emit('comboMilestone', {
                name: 'KILLING SPREE',
                kills: 25,
                multiplier: 2.0,
                color: 'rgb(0, 255, 0)',
                sound: 'none'
            });
        });

        const milestoneText = screen.getByText(/KILLING SPREE/i);
        expect(milestoneText).toBeInTheDocument();
        expect(milestoneText).toHaveStyle({ color: 'rgb(0, 255, 0)' });

        // Milestone text should disappear after 2 seconds
        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(screen.queryByText(/KILLING SPREE/i)).not.toBeInTheDocument();
    });

    it('should reset combo UI when comboEnd event is emitted', () => {
        render(<GameHUD status={GameStatus.PLAYING} />);

        act(() => {
            EventBus.emit('comboUpdate', { killStreak: 10, multiplier: 1.5 });
        });

        expect(screen.getByText(/10x COMBO/i)).toBeInTheDocument();

        act(() => {
            EventBus.emit('comboEnd', { finalStreak: 10, bonusXp: 100 });
        });

        expect(screen.queryByText(/10x COMBO/i)).not.toBeInTheDocument();
    });

    it('should show level up flash when levelUpStart is emitted', () => {
        const { container } = render(<GameHUD status={GameStatus.PLAYING} />);

        const flashOverlay = container.querySelector('.bg-white');
        expect(flashOverlay).toHaveStyle({ opacity: 0 });

        act(() => {
            EventBus.emit('levelUpStart', {});
        });

        expect(flashOverlay).toHaveStyle({ opacity: 0.5 });

        act(() => {
            vi.advanceTimersByTime(501);
        });

        expect(flashOverlay).toHaveStyle({ opacity: 0 });
    });
});
