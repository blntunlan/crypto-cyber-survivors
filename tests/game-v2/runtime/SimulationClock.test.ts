import { describe, expect, it } from 'vitest';
import { SimulationClock } from '@/game-v2/runtime/SimulationClock';

const simulate = (fps: number): number => {
  const clock = new SimulationClock();

  for (let frame = 0; frame < fps * 10; frame += 1) {
    clock.advance(1000 / fps, () => undefined);
  }

  return clock.tick;
};

describe('SimulationClock', () => {
  it.each([30, 60, 120])(
    'runs exactly 600 fixed ticks over ten seconds at %d FPS',
    fps => {
      expect(simulate(fps)).toBe(600);
    }
  );

  it('freezes simulation ticks while paused and resumes from the same time', () => {
    const clock = new SimulationClock();
    let steps = 0;

    clock.advance(1000 / 60, () => {
      steps += 1;
    });
    clock.pause();

    const pausedResult = clock.advance(1000, () => {
      steps += 1;
    });

    expect(clock.tick).toBe(1);
    expect(steps).toBe(1);
    expect(pausedResult.steps).toBe(0);

    clock.resume();
    clock.advance(1000 / 60, () => {
      steps += 1;
    });

    expect(clock.tick).toBe(2);
    expect(steps).toBe(2);
  });

  it('keeps interpolation state frozen while paused', () => {
    const clock = new SimulationClock();
    const beforePauseAlpha = clock.advance(5, () => undefined).interpolationAlpha;

    clock.pause();
    const whilePaused = clock.advance(1000, () => undefined);

    expect(whilePaused.interpolationAlpha).toBe(beforePauseAlpha);
    expect(whilePaused.droppedMilliseconds).toBe(0);
  });

  it('resets tick and accumulated simulation time to zero', () => {
    const clock = new SimulationClock();

    clock.advance(1000 / 60 + 1, () => undefined);
    clock.reset();

    expect(clock.tick).toBe(0);
    expect(clock.advance(1000 / 60 - 1, () => undefined).steps).toBe(0);
    expect(clock.advance(1, () => undefined).steps).toBe(1);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid render delta %s',
    renderDeltaMs => {
      const clock = new SimulationClock();

      expect(() => clock.advance(renderDeltaMs, () => undefined)).toThrow(RangeError);
    }
  );

  it('caps accepted render time at 250 ms', () => {
    const clock = new SimulationClock();
    let steps = 0;

    const result = clock.advance(1000, () => {
      steps += 1;
    });

    expect(result.steps).toBe(8);
    expect(steps).toBe(8);
    expect(result.droppedMilliseconds).toBeGreaterThanOrEqual(750);
  });

  it('drops excess catch-up time after at most eight fixed steps', () => {
    const clock = new SimulationClock();
    let steps = 0;

    const result = clock.advance(250, () => {
      steps += 1;
    });

    expect(result.steps).toBe(8);
    expect(steps).toBe(8);
    expect(result.droppedMilliseconds).toBeGreaterThan(0);
    expect(result.interpolationAlpha).toBeGreaterThanOrEqual(0);
    expect(result.interpolationAlpha).toBeLessThan(1);
  });
});
