/**
 * QualitySection - Performance Settings Component
 *
 * Controls for performance profile selection (Auto, Low, Medium, High, Ultra).
 */

import { memo, useState, useEffect } from 'react';
import { DeviceBenchmarkService } from '../../services/DeviceBenchmarkService';
import { DeviceProfile } from '../../types/DeviceProfile';
import { Logger } from '../../services/Logger';
import { IconCpu } from '../icons/CardIcons';
import { useLanguage } from '../../contexts/LanguageContext';

export const QualitySection = memo(({ isFocused = false }: { isFocused?: boolean }) => {
  const [currentProfile, setCurrentProfile] = useState(
    DeviceBenchmarkService.getPerformanceConfig().profile
  );
  const { t } = useLanguage();

  const [isAuto, setIsAuto] = useState<boolean>(
    !DeviceBenchmarkService.isInManualMode()
  );

  useEffect(() => {
    const updateState = () => {
      const config = DeviceBenchmarkService.getPerformanceConfig();
      const inManualMode = DeviceBenchmarkService.isInManualMode();

      setCurrentProfile(config.profile);
      setIsAuto(!inManualMode);

      Logger.debug('[QualitySection] updateState called', {
        profile: config.profile,
        isManualMode: inManualMode,
        isAuto: !inManualMode,
      });
    };

    updateState();
    return DeviceBenchmarkService.subscribe(updateState);
  }, []);

  const handleProfileChange = (profile: DeviceProfile) => {
    DeviceBenchmarkService.setManualProfile(profile);
  };

  const handleAutoClick = () => {
    DeviceBenchmarkService.resetToAuto();
  };

  const getProfileColor = (p: DeviceProfile) => {
    switch (p) {
      case DeviceProfile.ULTRA:
        return 'text-purple-400 border-purple-400/50 bg-purple-400/10';
      case DeviceProfile.HIGH:
        return 'text-green-400 border-green-400/50 bg-green-400/10';
      case DeviceProfile.MEDIUM:
        return 'text-yellow-400 border-yellow-400/50 bg-yellow-400/10';
      case DeviceProfile.LOW:
        return 'text-red-400 border-red-400/50 bg-red-400/10';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="flex justify-between items-end">
        <h3 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <IconCpu className="w-3.5 h-3.5" color="#64748b" />
          <span>{t('settings.quality')}</span>
        </h3>

        {isAuto && (
          <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider">
            ● {t('settings.quality_auto_active')}
          </span>
        )}
      </div>

      <div
        className={`bg-white/5 p-3 md:p-4 rounded-xl border border-white/5 space-y-3 transition-all ${
          isFocused
            ? 'ring-2 ring-white shadow-[0_0_15px_rgba(255,255,255,0.3)] bg-white/10'
            : ''
        }`}
      >
        <div className="flex gap-2">
          <button
            onClick={handleAutoClick}
            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${
              isAuto
                ? 'bg-blue-500 text-white border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                : 'bg-white/5 text-slate-400 border-transparent hover:bg-white/10'
            }`}
          >
            {t('settings.quality_auto')}
          </button>

          {Object.values(DeviceProfile).map(profile => (
            <button
              key={profile}
              onClick={() => handleProfileChange(profile)}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                !isAuto && currentProfile === profile
                  ? getProfileColor(profile) +
                    ' shadow-[0_0_10px_rgba(255,255,255,0.1)]'
                  : 'bg-white/5 text-slate-500 border-transparent hover:bg-white/10'
              }`}
            >
              {t(`settings.quality_${profile.toLowerCase()}`)}
            </button>
          ))}
        </div>

        <div className="text-[10px] text-slate-400 font-tech text-center">
          {currentProfile === DeviceProfile.ULTRA && t('settings.quality_desc_ultra')}
          {currentProfile === DeviceProfile.HIGH && t('settings.quality_desc_high')}
          {currentProfile === DeviceProfile.MEDIUM && t('settings.quality_desc_medium')}
          {currentProfile === DeviceProfile.LOW && t('settings.quality_desc_low')}
        </div>
      </div>
    </section>
  );
});

QualitySection.displayName = 'QualitySection';
