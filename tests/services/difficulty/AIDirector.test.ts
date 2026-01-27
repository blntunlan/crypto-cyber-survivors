import { describe, it, expect, beforeEach } from 'vitest';
import { AIDirector } from '../../../services/difficulty/AIDirector';

describe('AIDirector', () => {
  beforeEach(() => {
    AIDirector.setEnabled(true);
  });

  it('should initialize neural network without crashing', () => {
    const outputs = AIDirector.getOutputs();
    expect(outputs).toBeDefined();
    expect(outputs.spawnDensity).toBeGreaterThanOrEqual(0);
    expect(outputs.spawnDensity).toBeLessThanOrEqual(1);
  });

  it('should update outputs based on player stats', () => {
    AIDirector.setPlayerStats(100, 100, 5, 10);

    // Trigger update (needs time bypass)

    // We can't easily test the neural net's specific logic without training,
    // but we can ensure the update call path is clean.
    AIDirector.update(Date.now() + 2000);

    const newOutputs = AIDirector.getOutputs();
    expect(newOutputs).toBeDefined();
  });
});
