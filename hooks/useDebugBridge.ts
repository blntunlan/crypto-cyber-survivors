import { useEffect, useRef } from 'react';
import { EventBus } from '../services/core/EventBus';
import { ComboSystem } from '../services/combat/ComboSystem';

interface DebugBridgeHandlers {
  onLevelUp: () => void;
  onGameOver: () => void;
}

const DEBUG_API_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG_API === 'true';

export function useDebugBridge({ onLevelUp, onGameOver }: DebugBridgeHandlers): void {
  const onLevelUpRef = useRef(onLevelUp);
  const onGameOverRef = useRef(onGameOver);

  useEffect(() => {
    onLevelUpRef.current = onLevelUp;
    onGameOverRef.current = onGameOver;
  }, [onLevelUp, onGameOver]);

  useEffect(() => {
    if (!DEBUG_API_ENABLED) {
      return;
    }

    window.EventBus = EventBus;
    window.ComboSystem = ComboSystem;
    window.GameHelpers = {
      triggerLevelUp: () => onLevelUpRef.current(),
      triggerCycleComplete: () => {
        EventBus.emit('cycleComplete', {
          cycleNumber: 1,
          totalElapsedSeconds: 300,
        });
      },
      triggerGameOver: () => onGameOverRef.current(),
    };

    return () => {
      delete window.GameHelpers;
      delete window.ComboSystem;
      delete window.EventBus;
    };
  }, []);
}
