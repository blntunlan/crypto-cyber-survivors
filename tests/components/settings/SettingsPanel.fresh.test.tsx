import { describe, it, expect } from 'vitest';
import { SettingsPanel } from '../../../components/settings/SettingsPanel';

describe('SettingsPanel freshness', () => {
  it('exports component', () => {
    expect(SettingsPanel).toBeDefined();
  });
});
