/**
 * QualitySection - Performance Settings Component
 *
 * Controls for performance profile selection (Auto, Low, Medium, High, Ultra).
 */

import { memo, useState, useEffect } from 'react';
import { DeviceBenchmarkService } from '../../services/system/DeviceBenchmarkService';
import { DeviceProfile } from '../../types/DeviceProfile';
import { IconCpu } from '../icons/CardIcons';
import { useLanguage } from '../../contexts/LanguageContext';

export const QualitySection = memo(
  ({ focusedItem = null }: { focusedItem?: 'auto' | DeviceProfile | null }) => {
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
        <div className="flex items-end justify-between">
          <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 md:text-xs">
            <IconCpu className="h-3.5 w-3.5" color="#64748b" />
            <span>{t('settings.quality')}</span>
          </h3>

          {isAuto && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-green-500">
              ● {t('settings.quality_auto_active')}
            </span>
          )}
        </div>

        <div className="space-y-4 rounded-sm border border-white/5 bg-white/5 p-3 transition-all md:p-4">
          <div className="flex flex-col gap-2">
            {/* Auto Toggle */}
            <button
              onClick={handleAutoClick}
              className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-[11px] font-black uppercase transition-all ${
                isAuto
                  ? 'border-blue-400 bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]'
                  : 'border-white/5 bg-white/5 text-slate-400 hover:bg-white/10'
              } ${focusedItem === 'auto' ? 'scale-[1.02] bg-blue-500 ring-2 ring-white' : ''}`}
            >
              <span>{t('settings.quality_auto')}</span>
              {isAuto && <span className="animate-pulse text-[9px]">ACTIVE</span>}
            </button>

            {/* Manual Profiles Grid/List */}
            <div className="flex flex-col gap-2">
              {Object.values(DeviceProfile).map(profile => {
                const isSelected = !isAuto && currentProfile === profile;
                const isFocused = focusedItem === profile;

                return (
                  <button
                    key={profile}
                    onClick={() => handleProfileChange(profile)}
                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-[11px] font-black uppercase transition-all ${
                      isSelected
                        ? getProfileColor(profile) + ' shadow-[0_0_10px_currentColor]'
                        : 'border-white/5 bg-white/5 text-slate-500 hover:bg-white/10'
                    } ${isFocused ? 'scale-[1.02] bg-white/10 ring-2 ring-white' : ''}`}
                  >
                    <span>{t(`settings.quality_${profile.toLowerCase()}`)}</span>
                    {isSelected && <span className="text-[9px]">SELECTED</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 text-center font-tech text-[10px] text-slate-400">
            {currentProfile === DeviceProfile.ULTRA && t('settings.quality_desc_ultra')}
            {currentProfile === DeviceProfile.HIGH && t('settings.quality_desc_high')}
            {currentProfile === DeviceProfile.MEDIUM &&
              t('settings.quality_desc_medium')}
            {currentProfile === DeviceProfile.LOW && t('settings.quality_desc_low')}
          </div>
        </div>
      </section>
    );
  }
);

QualitySection.displayName = 'QualitySection';
