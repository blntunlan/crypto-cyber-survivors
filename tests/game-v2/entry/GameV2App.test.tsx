import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

import GameV2App from '@/game-v2/GameV2App';
import { PLAYER_MAX_HEALTH } from '@/game-v2/config/Mvp0Config';
import { type RendererPort } from '@/game-v2/presentation/ThreeScene';

type RendererProbe = {
  factory: (canvas: HTMLCanvasElement) => RendererPort;
  created: number;
  disposed: number;
  rendered: number;
};

const createRendererProbe = (): RendererProbe => {
  const probe: RendererProbe = {
    created: 0,
    disposed: 0,
    rendered: 0,
    factory: () => {
      probe.created += 1;

      return {
        render: () => {
          probe.rendered += 1;
        },
        setSize: () => {},
        dispose: () => {
          probe.disposed += 1;
        },
      };
    },
  };

  return probe;
};

afterEach(() => {
  cleanup();
  delete window.gameV2Debug;
});

describe('GameV2App', () => {
  it('starts one run on mount and publishes the HUD and debug surface', async () => {
    const probe = createRendererProbe();
    render(<GameV2App createRenderer={probe.factory} />);

    expect(screen.getByTestId('game-v2-canvas')).toBeInTheDocument();
    expect(probe.created).toBe(1);
    expect(screen.getByTestId('game-v2-hud-level').textContent).toBe('LV 1');
    expect(screen.getByTestId('game-v2-hud-health').textContent).toBe(
      `HP ${PLAYER_MAX_HEALTH}/${PLAYER_MAX_HEALTH}`
    );

    const debugSurface = window.gameV2Debug;
    expect(debugSurface).toBeDefined();
    expect(debugSurface?.getSnapshot().phase).toBe('playing');

    await waitFor(() => {
      expect(window.gameV2Debug?.getSnapshot().tick ?? 0).toBeGreaterThan(0);
    });

    expect(probe.rendered).toBeGreaterThan(0);
  });

  it('stops the loop and disposes the renderer on unmount', async () => {
    const probe = createRendererProbe();
    const view = render(<GameV2App createRenderer={probe.factory} />);

    await waitFor(() => {
      expect(window.gameV2Debug?.getSnapshot().tick ?? 0).toBeGreaterThan(0);
    });

    view.unmount();

    expect(probe.disposed).toBe(1);
    expect(window.gameV2Debug).toBeUndefined();

    const rendersAtUnmount = probe.rendered;
    await new Promise(resolve => {
      setTimeout(resolve, 80);
    });

    expect(probe.rendered).toBe(rendersAtUnmount);
  });
});
