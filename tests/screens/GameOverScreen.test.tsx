import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameOverScreen } from '../../components/screens/GameOverScreen';

describe('GameOverScreen', () => {
    it('should render level and final pnl', () => {
        render(<GameOverScreen level={10} finalPnl={0.5} onRestart={() => { }} />);
        expect(screen.getByText('L10')).toBeDefined();
        expect(screen.getByText('50.0%')).toBeDefined();
    });

    it('should call onRestart when button is clicked', () => {
        const onRestart = vi.fn();
        render(<GameOverScreen level={10} finalPnl={0.5} onRestart={onRestart} />);

        fireEvent.click(screen.getByText(/Back to Terminal/i));
        expect(onRestart).toHaveBeenCalled();
    });
});
