import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MobileControls } from '../components/mobile/MobileControls';
import { GameStatus } from '../types';
import { MobileControlSettings } from '../types/MobileSettings';

// Mock child components to keep it simple
vi.mock('../components/mobile/VirtualJoystick', () => ({
    VirtualJoystick: ({ onMove }: { onMove: (x: number, y: number) => void }) => (
        <div data-testid="virtual-joystick" onClick={() => onMove(1, 0)}>Joystick</div>
    )
}));

vi.mock('../components/mobile/DashButton', () => ({
    DashButton: ({ onDash }: { onDash: () => void }) => (
        <button data-testid="dash-button" onClick={onDash}>Dash</button>
    )
}));

vi.mock('../components/mobile/DragToMoveController', () => ({
    DragToMoveController: ({ onMove, onDash }: { onMove: (x: number, y: number) => void, onDash: () => void }) => (
        <div data-testid="drag-controller"
            onClick={() => onMove(0.5, 0.5)}
            onContextMenu={(e) => { e.preventDefault(); onDash(); }}>
            Drag
        </div>
    )
}));

describe('MobileControls', () => {
    const mockSettings: MobileControlSettings = {
        controlType: 'joystick',
        dashMethod: 'button',
        joystickSize: 'medium',
        joystickPosition: 'left',
        hapticFeedback: true,
        showDragFeedback: true,
        sensitivity: 1.0
    };

    const mockOnMove = vi.fn();
    const mockOnDash = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should not render if game status is not PLAYING', () => {
        const { container } = render(
            <MobileControls
                status={GameStatus.MENU}
                settings={mockSettings}
                onMove={mockOnMove}
                onDash={mockOnDash}
                dashCooldownMs={1000}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('should render Joystick + Dash Button when controlType is joystick', () => {
        render(
            <MobileControls
                status={GameStatus.PLAYING}
                settings={mockSettings}
                onMove={mockOnMove}
                onDash={mockOnDash}
                dashCooldownMs={1000}
            />
        );
        expect(screen.getByTestId('virtual-joystick')).toBeInTheDocument();
        expect(screen.getByTestId('dash-button')).toBeInTheDocument();
        expect(screen.queryByTestId('drag-controller')).not.toBeInTheDocument();
    });

    it('should render Drag Controller when controlType is drag', () => {
        const dragSettings = { ...mockSettings, controlType: 'drag' as const };
        render(
            <MobileControls
                status={GameStatus.PLAYING}
                settings={dragSettings}
                onMove={mockOnMove}
                onDash={mockOnDash}
                dashCooldownMs={1000}
            />
        );
        expect(screen.getByTestId('drag-controller')).toBeInTheDocument();
        expect(screen.queryByTestId('virtual-joystick')).not.toBeInTheDocument();
        expect(screen.queryByTestId('dash-button')).not.toBeInTheDocument();
    });

    it('should propagate movement and dash events from joystick system', () => {
        render(
            <MobileControls
                status={GameStatus.PLAYING}
                settings={mockSettings}
                onMove={mockOnMove}
                onDash={mockOnDash}
                dashCooldownMs={1000}
            />
        );

        screen.getByTestId('virtual-joystick').click();
        expect(mockOnMove).toHaveBeenCalledWith(1, 0);

        screen.getByTestId('dash-button').click();
        expect(mockOnDash).toHaveBeenCalled();
    });
});
