import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LevelUpScreen } from '../../components/screens/LevelUpScreen';
import { Card } from '../../services/CardSystem';

describe('LevelUpScreen', () => {
    const mockChoices: Card[] = [
        {
            id: 'test-1',
            name: 'Test Upgrade',
            description: 'Test Description',
            icon: '🔥',
            tier: 'common',
            effect: (p) => p,
        }
    ];

    it('should render upgrade choices', () => {
        render(<LevelUpScreen upgradeChoices={mockChoices} onSelect={() => { }} />);
        expect(screen.getByText('Test Upgrade')).toBeDefined();
        expect(screen.getByText('Test Description')).toBeDefined();
    });

    it('should call onSelect when a choice is clicked', () => {
        const onSelect = vi.fn();
        render(<LevelUpScreen upgradeChoices={mockChoices} onSelect={onSelect} />);

        fireEvent.click(screen.getByText('Test Upgrade'));
        expect(onSelect).toHaveBeenCalledWith(mockChoices[0]);
    });
});
