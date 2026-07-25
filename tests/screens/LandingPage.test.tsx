import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../test-utils';
import { LandingPage } from '../../components/screens/LandingPage';

vi.mock('../../components/screens/landing/LandingBackground', () => ({
  LandingBackground: () => <div data-testid="landing-background" />,
}));

vi.mock('../../components/screens/landing/LandingHero', () => ({
  LandingHero: ({ onLaunch }: { onLaunch: () => void }) => (
    <button type="button" onClick={onLaunch}>
      START SURVIVAL
    </button>
  ),
}));

vi.mock('../../components/screens/landing/LandingFeatures', () => ({
  LandingFeatures: () => <div />,
}));
vi.mock('../../components/screens/landing/LandingArchitecture', () => ({
  LandingArchitecture: () => <div />,
}));
vi.mock('../../components/screens/landing/LandingModes', () => ({
  LandingModes: () => <div />,
}));
vi.mock('../../components/screens/landing/LandingRoadmap', () => ({
  LandingRoadmap: () => <div />,
}));
vi.mock('../../components/screens/landing/LandingTeam', () => ({
  LandingTeam: () => <div />,
}));
vi.mock('../../components/screens/landing/LandingFaq', () => ({
  LandingFaq: () => <div />,
}));
vi.mock('../../components/screens/landing/LandingFooter', () => ({
  LandingFooter: () => <footer />,
}));

describe('LandingPage', () => {
  it('uses themed primitives for primary, documentation, and mobile navigation actions', () => {
    const onLaunch = vi.fn();
    const onViewDocs = vi.fn();

    render(
      <LandingPage
        onLaunch={onLaunch}
        onViewDocs={onViewDocs}
        onViewPrivacy={() => {}}
        onViewTerms={() => {}}
      />
    );

    const playButton = screen.getByRole('button', { name: 'PLAY THE BETA' });
    expect(playButton).toHaveAttribute('data-ui-component', 'button');

    const documentationButton = screen.getByRole('button', { name: 'Documentation' });
    expect(documentationButton).toHaveAttribute('data-ui-component', 'button');

    const menuButton = screen.getByRole('button', { name: 'Open menu' });
    expect(menuButton).toHaveAttribute('data-ui-component', 'icon-button');
    fireEvent.click(menuButton);

    const closeButton = screen.getByRole('button', { name: 'Close menu' });
    expect(closeButton).toHaveAttribute('data-ui-component', 'icon-button');
  });
});
