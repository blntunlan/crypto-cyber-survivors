import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ThemedButton } from '../themed/ThemedButton';
import { OverlayChrome } from '../ui/OverlayChrome';
import { StatePanel } from '../ui/StatePanel';

interface MarketDisconnectedScreenProps {
  onBackToMenu: () => void;
}

export const MarketDisconnectedScreen: React.FC<MarketDisconnectedScreenProps> = ({
  onBackToMenu,
}) => {
  const { t } = useLanguage();

  return (
    <OverlayChrome
      zIndex={2200}
      maxWidthClassName="max-w-2xl"
      title={t('market.disconnected_title')}
      subtitle={t('market.waiting_signal') as string}
    >
      <StatePanel
        className="mx-auto w-full max-w-xl"
        state="error"
        title={t('market.disconnected_status')}
        description={t('market.disconnected_desc')}
        action={
          <ThemedButton
            intent="secondary"
            onClick={onBackToMenu}
            className="w-full max-w-xs"
          >
            {t('market.exit_terminal')}
          </ThemedButton>
        }
      />
    </OverlayChrome>
  );
};
