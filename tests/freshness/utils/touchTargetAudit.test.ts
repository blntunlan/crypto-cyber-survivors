import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '../../../services/system/Logger';
import {
  auditTouchTargets,
  highlightTouchTargetIssues,
} from '../../../utils/touchTargetAudit';

function mockRect(width: number, height: number, left = 0, top = 0): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect;
}

describe('touchTargetAudit', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('flags interactive elements below 44px', () => {
    const warnSpy = vi.spyOn(Logger, 'warn').mockImplementation(() => undefined);
    const infoSpy = vi.spyOn(Logger, 'info').mockImplementation(() => undefined);

    document.body.innerHTML =
      '<button id="small">S</button><button id="ok">OK</button>';

    const small = document.getElementById('small') as HTMLButtonElement;
    const ok = document.getElementById('ok') as HTMLButtonElement;

    vi.spyOn(small, 'getBoundingClientRect').mockReturnValue(mockRect(30, 30));
    vi.spyOn(ok, 'getBoundingClientRect').mockReturnValue(mockRect(60, 60));

    const issues = auditTouchTargets();

    expect(issues).toHaveLength(1);
    expect(issues[0]?.element).toBe('#small');
    expect(issues[0]?.minDimension).toBe(30);
    expect(issues[0]?.recommendation).toContain('44px');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('reports success when all targets are compliant', () => {
    const warnSpy = vi.spyOn(Logger, 'warn').mockImplementation(() => undefined);
    const infoSpy = vi.spyOn(Logger, 'info').mockImplementation(() => undefined);

    document.body.innerHTML = '<button id="ok">OK</button>';
    const ok = document.getElementById('ok') as HTMLButtonElement;
    vi.spyOn(ok, 'getBoundingClientRect').mockReturnValue(mockRect(44, 44));

    const issues = auditTouchTargets();

    expect(issues).toHaveLength(0);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('adds and removes highlight overlay on click', () => {
    vi.useFakeTimers();
    vi.spyOn(Logger, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Logger, 'info').mockImplementation(() => undefined);

    document.body.innerHTML = '<button id="small">S</button>';
    const small = document.getElementById('small') as HTMLButtonElement;
    vi.spyOn(small, 'getBoundingClientRect').mockReturnValue(mockRect(20, 20, 10, 10));

    highlightTouchTargetIssues();

    expect(document.querySelectorAll('.touch-target-highlight').length).toBeGreaterThan(
      0
    );

    vi.advanceTimersByTime(120);
    document.dispatchEvent(new MouseEvent('click'));

    expect(document.querySelectorAll('.touch-target-highlight')).toHaveLength(0);
  });
});
