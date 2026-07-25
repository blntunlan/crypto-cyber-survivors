import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../test-utils';
import { retro16bitTheme } from '../../../config/themes';
import { ThemeContext } from '../../../contexts/themeContextDef';
import { OverlayBackButton, OverlayChrome } from '../../../components/ui/OverlayChrome';

describe('OverlayChrome', () => {
  it('renders modern decision overlays as a War Room surface', () => {
    render(<OverlayChrome title="Decision">Overlay content</OverlayChrome>);

    expect(screen.getByTestId('overlay-chrome-surface')).toHaveAttribute(
      'data-overlay-style',
      'war-room'
    );
  });

  it('keeps the overlay hierarchy and back action in the retro skin', () => {
    const onBack = vi.fn();

    render(
      <ThemeContext.Provider
        value={{
          theme: retro16bitTheme,
          themeName: 'retro-16bit',
          setTheme: () => {},
          toggleTheme: () => {},
          isRetro: true,
          isTransitioning: false,
        }}
      >
        <OverlayChrome title="Decision">Overlay content</OverlayChrome>
        <OverlayBackButton label="Back" onClick={onBack} />
      </ThemeContext.Provider>
    );

    expect(screen.getByTestId('overlay-chrome-surface')).toHaveAttribute(
      'data-overlay-style',
      'arcade'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('uses a square mobile back button and padded desktop sizing', () => {
    render(<OverlayBackButton label="Hub" onClick={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Hub' })).toHaveClass(
      'h-11',
      'w-11',
      'px-0',
      'sm:h-auto',
      'sm:w-auto',
      'sm:px-3'
    );
  });
});
