import { describe, expect, it } from 'vitest';
import { render, screen } from '../../test-utils';
import { OverlayChrome } from '../../../components/ui/OverlayChrome';

describe('OverlayChrome', () => {
  it('renders modern decision overlays as a War Room surface', () => {
    render(<OverlayChrome title="Decision">Overlay content</OverlayChrome>);

    expect(screen.getByTestId('overlay-chrome-surface')).toHaveAttribute(
      'data-overlay-style',
      'war-room'
    );
  });
});
