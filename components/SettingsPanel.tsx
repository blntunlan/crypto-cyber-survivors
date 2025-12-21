/**
 * SettingsPanel - Legacy Re-export
 *
 * This file now re-exports from the modular settings system.
 * All functionality has been moved to ./settings/ directory.
 *
 * @deprecated Import from './settings' or './settings/SettingsPanel' directly
 *
 * Structure:
 * - settings/SettingsPanel.tsx   - Main container
 * - settings/AudioSection.tsx    - Volume and mute controls
 * - settings/QualitySection.tsx  - Performance profile selection
 * - settings/GraphicsSection.tsx - Visual toggles
 * - settings/MobileSection.tsx   - Mobile-specific controls
 * - settings/ControlsSection.tsx - Keyboard shortcuts display
 * - settings/ToggleButton.tsx    - Reusable toggle component
 * - settings/index.ts            - Public exports
 */

// Re-export main component
export { SettingsPanel } from './settings';
