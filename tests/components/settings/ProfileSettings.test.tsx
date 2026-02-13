import { describe, it, expect } from 'vitest';
import {
  ProfileSettings,
  ProfileSettingsContent,
} from '../../../components/settings/ProfileSettings';

describe('ProfileSettings', () => {
  it('exports profile settings components', () => {
    expect(ProfileSettings).toBeDefined();
    expect(ProfileSettingsContent).toBeDefined();
  });
});
