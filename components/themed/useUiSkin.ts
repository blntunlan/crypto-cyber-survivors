import { UI_COMPONENT_SKINS } from '../../config/ui/componentVariants';
import { useTheme } from '../../contexts/useTheme';

export function useUiSkin() {
  const { themeName } = useTheme();

  return UI_COMPONENT_SKINS[themeName];
}
