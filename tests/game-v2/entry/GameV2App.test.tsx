import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import GameV2App from '@/game-v2/GameV2App';
import { PLAYER_MAX_HEALTH } from '@/game-v2/config/Mvp0Config';
import {
  type MarketFeedSource,
  type MarketFeedUpdate,
} from '@/game-v2/market/MarketFeedSource';
import { type RendererPort } from '@/game-v2/presentation/ThreeScene';

type RendererProbe = {
  factory: (canvas: HTMLCanvasElement) => RendererPort;
  created: number;
  disposed: number;
  rendered: number;
};

const createRendererProbe = (throwOnRenderCall = 0): RendererProbe => {
  const probe: RendererProbe = {
    created: 0,
    disposed: 0,
    rendered: 0,
    factory: () => {
      probe.created += 1;

      return {
        render: () => {
          probe.rendered += 1;

          if (throwOnRenderCall > 0 && probe.rendered >= throwOnRenderCall) {
            throw new RangeError('renderer exploded');
          }
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

const VALID_UPDATE: MarketFeedUpdate = Object.freeze({
  price: 65_000,
  rsi: 55,
  rsiState: 'NEUTRAL',
  atrPercent: 1.5,
  normalizedVolume: 2.3,
  volumePercentile: 0.7,
  whaleTier: 2,
  trendStrength: 0.4,
  trendDirection: 'UP',
  timestamp: 1_700_000_000_000,
  isSynthetic: false,
});

/** Immediately publishes a valid price on connect; never opens a real EventSource. */
const createFakeMarketFeedSource = (): {
  createSource: () => MarketFeedSource;
  disconnectCalls: number;
} => {
  const state = { disconnectCalls: 0 };

  return {
    createSource: () => ({
      connect: onUpdate => {
        onUpdate(VALID_UPDATE);
      },
      disconnect: () => {
        state.disconnectCalls += 1;
      },
    }),
    disconnectCalls: state.disconnectCalls,
  };
};

/** Selects LONG at 1x and clicks Start; the caller's fake feed must resolve a price first. */
const startRun = async (): Promise<void> => {
  await waitFor(() => {
    expect(screen.getByTestId('position-select-start')).toBeEnabled();
  });
  fireEvent.click(screen.getByTestId('position-select-start'));
};

afterEach(() => {
  cleanup();
  delete window.gameV2Debug;
});

describe('GameV2App', () => {
  it('shows the position select screen before any run starts', () => {
    const { createSource } = createFakeMarketFeedSource();
    render(<GameV2App createMarketFeedSource={createSource} />);

    expect(screen.getByTestId('position-select-overlay')).toBeInTheDocument();
    expect(screen.queryByTestId('game-v2-canvas')).not.toBeInTheDocument();
  });

  it('starts one run after Start is clicked and publishes the HUD and debug surface', async () => {
    const probe = createRendererProbe();
    const { createSource } = createFakeMarketFeedSource();
    render(
      <GameV2App createRenderer={probe.factory} createMarketFeedSource={createSource} />
    );

    await startRun();

    expect(screen.getByTestId('game-v2-canvas')).toBeInTheDocument();
    expect(probe.created).toBe(1);
    expect(screen.getByTestId('game-v2-hud-level').textContent).toBe('LV 1');
    expect(screen.getByTestId('game-v2-hud-health').textContent).toBe(
      `HP ${PLAYER_MAX_HEALTH}/${PLAYER_MAX_HEALTH}`
    );

    await waitFor(() => {
      expect(screen.getByTestId('game-v2-hud-ability-0')).toBeVisible();
    });
    expect(screen.getByTestId('game-v2-hud-ability-0').textContent).toBe('AUTO Lv1');
    expect(screen.getByTestId('game-v2-hud-ability-1')).not.toBeVisible();
    expect(screen.getByTestId('game-v2-hud-ability-2')).not.toBeVisible();
    expect(screen.getByTestId('game-v2-hud-ability-3')).not.toBeVisible();

    const debugSurface = window.gameV2Debug;
    expect(debugSurface).toBeDefined();
    expect(debugSurface?.getSnapshot().phase).toBe('playing');

    await waitFor(() => {
      expect(window.gameV2Debug?.getSnapshot().tick ?? 0).toBeGreaterThan(0);
    });

    expect(probe.rendered).toBeGreaterThan(0);
  });

  it('locks the selected side/leverage and the live price into the runtime position', async () => {
    const probe = createRendererProbe();
    const { createSource } = createFakeMarketFeedSource();
    render(
      <GameV2App createRenderer={probe.factory} createMarketFeedSource={createSource} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('position-select-start')).toBeEnabled();
    });
    fireEvent.click(screen.getByTestId('position-select-side-short'));
    fireEvent.click(screen.getByTestId('position-select-leverage-25'));
    fireEvent.click(screen.getByTestId('position-select-start'));

    await waitFor(() => {
      expect(window.gameV2Debug?.getSnapshot().tick ?? 0).toBeGreaterThanOrEqual(0);
    });

    expect(window.gameV2Debug).toBeDefined();
  });

  it('stops the loop and disposes the renderer on unmount', async () => {
    const probe = createRendererProbe();
    const { createSource } = createFakeMarketFeedSource();
    const view = render(
      <GameV2App createRenderer={probe.factory} createMarketFeedSource={createSource} />
    );
    await startRun();

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

  it('survives the StrictMode double mount with one live runtime', async () => {
    const probe = createRendererProbe();
    const { createSource } = createFakeMarketFeedSource();
    const view = render(
      <React.StrictMode>
        <GameV2App
          createRenderer={probe.factory}
          createMarketFeedSource={createSource}
        />
      </React.StrictMode>
    );
    await startRun();

    // React 19 double-invokes an effect only on the tree's initial commit.
    // The runtime is now created by a *later* state transition (Start
    // clicked, `appStage` flips to 'run'), not during that initial commit —
    // the 'select' stage's market-feed effect is what runs twice and
    // settles before Start is even clickable — so exactly one runtime and
    // one debug surface exist once a run starts.
    expect(probe.created).toBe(1);
    expect(probe.disposed).toBe(0);
    expect(window.gameV2Debug).toBeDefined();

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

  it('stops the loop and reports the failure when a frame throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const probe = createRendererProbe(3);
    const { createSource } = createFakeMarketFeedSource();

    try {
      render(
        <GameV2App
          createRenderer={probe.factory}
          createMarketFeedSource={createSource}
        />
      );
      await startRun();

      await waitFor(() => {
        expect(screen.getByTestId('game-v2-failure-overlay')).toBeInTheDocument();
      });

      const rendersAtFailure = probe.rendered;
      await new Promise(resolve => {
        setTimeout(resolve, 120);
      });

      // The next frame was already scheduled when the throw happened, so a
      // missing cancel would keep it running forever.
      expect(probe.rendered).toBe(rendersAtFailure);
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
