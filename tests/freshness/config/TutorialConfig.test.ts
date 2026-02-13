import { describe, it, expect } from 'vitest';
import {
  TUTORIAL_STEPS,
  TUTORIAL_STORAGE_KEYS,
  TUTORIAL_TOTAL_STEPS,
  getTutorialStepById,
  getTutorialStepIndex,
} from '../../../config/TutorialConfig';

describe('TutorialConfig', () => {
  it('keeps step count and IDs consistent', () => {
    expect(TUTORIAL_TOTAL_STEPS).toBe(TUTORIAL_STEPS.length);
    expect(TUTORIAL_TOTAL_STEPS).toBeGreaterThan(0);

    const ids = TUTORIAL_STEPS.map(step => step.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolves steps by id and index', () => {
    const movement = getTutorialStepById('movement');

    expect(movement?.titleKey).toBe('tutorial.movement.title');
    expect(getTutorialStepIndex('movement')).toBeGreaterThanOrEqual(0);
  });

  it('returns safe fallback values for unknown ids', () => {
    expect(getTutorialStepById('not-a-step')).toBeUndefined();
    expect(getTutorialStepIndex('not-a-step')).toBe(-1);
  });

  it('defines stable localStorage keys', () => {
    expect(TUTORIAL_STORAGE_KEYS.COMPLETED).toBe('tutorial-completed');
    expect(TUTORIAL_STORAGE_KEYS.LAST_STEP).toBe('tutorial-last-step');
  });
});
