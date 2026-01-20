import React from 'react';
import { useTheme } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import { DeviceBenchmarkService } from '../../services/DeviceBenchmarkService';
import { DeviceProfile } from '../../types/DeviceProfile';
import type { useThemeSize } from '../../hooks/useThemeSize';

interface OptimizationBadgeProps {
  sizes: ReturnType<typeof useThemeSize>;
}

export const OptimizationBadge: React.FC<OptimizationBadgeProps> = ({ sizes }) => {
  const config = DeviceBenchmarkService.getPerformanceConfig();
  const { isRetro } = useTheme();
  const { t } = useLanguage();
  const profile = config.profile;

  const getColor = (p: DeviceProfile) => {
    switch (p) {
      case DeviceProfile.ULTRA:
        return `text-purple-400 bg-purple-500/10 ${isRetro ? '' : 'border-purple-500/20'}`;
      case DeviceProfile.HIGH:
        return `text-green-400 bg-green-500/10 ${isRetro ? '' : 'border-green-500/20'}`;
      case DeviceProfile.MEDIUM:
        return `text-yellow-400 bg-yellow-500/10 ${isRetro ? '' : 'border-yellow-500/20'}`;
      case DeviceProfile.LOW:
        return `text-red-400 bg-red-500/10 ${isRetro ? '' : 'border-red-500/20'}`;
      default:
        return `text-slate-400 bg-slate-500/10 ${isRetro ? '' : 'border-slate-500/20'}`;
    }
  };

  return (
    <div
      className={`px-3 py-1 border ${sizes.tiny} font-bold uppercase tracking-wider ${getColor(profile)} 
        ${isRetro ? 'rounded-none border-2 border-zinc-700 font-primary' : 'rounded-full'}`}
    >
      {t('common.menu.optimized')}: {profile}
    </div>
  );
};
