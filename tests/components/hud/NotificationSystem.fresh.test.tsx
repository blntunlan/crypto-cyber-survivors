import { describe, it, expect } from 'vitest';
import { NotificationSystem } from '../../../components/hud/NotificationSystem';

describe('NotificationSystem freshness', () => {
  it('exports component', () => {
    expect(NotificationSystem).toBeDefined();
  });
});
