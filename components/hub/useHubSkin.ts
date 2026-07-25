import { HUB_SKINS } from '../../config/ui/hubVariants';
import { useTheme } from '../../contexts/useTheme';

export function useHubSkin() {
  const { themeName } = useTheme();

  return HUB_SKINS[themeName];
}
