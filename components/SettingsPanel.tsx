import React from 'react';
import { audio } from '../services/audioService';
import { useGameStore } from '../stores/gameStore';
import { useDevice } from '../hooks/useDevice';
import { ControlType, JoystickPosition, JoystickSize } from '../types/MobileSettings';
import { screenService } from '../services/ScreenService';

interface SettingsPanelProps {
    onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
    // Use Zustand store for persistent settings
    const {
        audio: audioSettings,
        graphics,
        mobile,
        setMasterVolume,
        toggleMute,
        toggleParticles,
        toggleScreenShake,
        toggleDamageNumbers,
        setMobileSetting,
        resetSettings,
    } = useGameStore();

    const device = useDevice();

    // Sync audio service with store
    React.useEffect(() => {
        audio.setVolume(audioSettings.masterVolume);
        if (audioSettings.isMuted !== audio.getMuted()) {
            audio.toggleMute();
        }
    }, [audioSettings.masterVolume, audioSettings.isMuted]);

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setMasterVolume(newVolume);
        audio.setVolume(newVolume);
    };

    const handleMuteToggle = () => {
        toggleMute();
        audio.toggleMute();
    };

    const isMobile = screenService.isMobile();

    return (
        <div
            className="fixed inset-0 z-[2200] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-6"
            style={{
                paddingTop: `calc(${isMobile ? '1rem' : '2rem'} + env(safe-area-inset-top, 0px))`,
                paddingBottom: `calc(${isMobile ? '1rem' : '2rem'} + env(safe-area-inset-bottom, 0px))`
            }}
        >
            <div className={`max-w-md w-full bg-slate-900/50 border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-8 flex flex-col max-h-full shadow-[0_0_50px_rgba(0,0,0,0.5)]`}>
                <header className="text-center mb-4 md:mb-8 shrink-0">
                    <h2 className="text-2xl md:text-4xl font-black text-white italic tracking-tighter uppercase">
                        Settings
                    </h2>
                    <div className="h-1 w-12 bg-yellow-500 mx-auto mt-2 rounded-full" />
                </header>

                <div className="space-y-4 md:space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                    {/* Audio Section */}
                    <section className="space-y-3 md:space-y-4">
                        <h3 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">Audio</h3>

                        <div className="space-y-3 md:space-y-4 bg-white/5 p-3 md:p-4 rounded-xl border border-white/5">
                            <div className="flex justify-between items-center">
                                <span className="text-xs md:text-sm font-bold text-white uppercase">Master Volume</span>
                                <span className="text-[10px] md:text-xs font-mono text-slate-400">{Math.round(audioSettings.masterVolume * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={audioSettings.masterVolume}
                                onChange={handleVolumeChange}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                            />

                            <button
                                onClick={handleMuteToggle}
                                className={`w-full py-2 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all border ${audioSettings.isMuted
                                    ? 'bg-red-500/10 border-red-500/50 text-red-500'
                                    : 'bg-green-500/10 border-green-500/50 text-green-500'
                                    }`}
                            >
                                {audioSettings.isMuted ? '🔇 Sound OFF' : '🔊 Sound ON'}
                            </button>
                        </div>
                    </section>

                    {/* Mobile Controls Section - Only visible on mobile/tablet */}
                    {(device.isMobile || device.isTablet) && (
                        <section className="space-y-3 md:space-y-4">
                            <h3 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">Mobile Controls</h3>
                            <div className="space-y-3 md:space-y-4 bg-white/5 p-3 md:p-4 rounded-xl border border-white/5">
                                <div className="space-y-1">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Control Type</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setMobileSetting('controlType', 'drag' as ControlType)}
                                            className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${mobile.controlType === 'drag'
                                                ? 'bg-yellow-500 text-black'
                                                : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'}`}
                                        >
                                            Drag
                                        </button>
                                        <button
                                            onClick={() => setMobileSetting('controlType', 'joystick' as ControlType)}
                                            className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${mobile.controlType === 'joystick'
                                                ? 'bg-yellow-500 text-black'
                                                : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'}`}
                                        >
                                            Joystick
                                        </button>
                                    </div>
                                </div>

                                {mobile.controlType === 'joystick' && (
                                    <>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase">Joystick Size</span>
                                            <div className="grid grid-cols-3 gap-2">
                                                {(['small', 'medium', 'large'] as JoystickSize[]).map((size) => (
                                                    <button
                                                        key={size}
                                                        onClick={() => setMobileSetting('joystickSize', size)}
                                                        className={`py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${mobile.joystickSize === size
                                                            ? 'bg-yellow-500 text-black'
                                                            : 'bg-white/5 text-slate-400 border border-white/5'}`}
                                                    >
                                                        {size}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase">Joystick Side</span>
                                            <div className="grid grid-cols-2 gap-2">
                                                {(['left', 'right'] as JoystickPosition[]).map((pos) => (
                                                    <button
                                                        key={pos}
                                                        onClick={() => setMobileSetting('joystickPosition', pos)}
                                                        className={`py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${mobile.joystickPosition === pos
                                                            ? 'bg-yellow-500 text-black'
                                                            : 'bg-white/5 text-slate-400 border border-white/5'}`}
                                                    >
                                                        {pos}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                <ToggleButton
                                    label="Haptic Feedback"
                                    enabled={mobile.hapticFeedback}
                                    onToggle={() => setMobileSetting('hapticFeedback', !mobile.hapticFeedback)}
                                />
                                <ToggleButton
                                    label="Visual Feedback"
                                    enabled={mobile.showDragFeedback}
                                    onToggle={() => setMobileSetting('showDragFeedback', !mobile.showDragFeedback)}
                                />
                            </div>
                        </section>
                    )}
                    <section className="space-y-3 md:space-y-4">
                        <h3 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">Graphics</h3>
                        <div className="space-y-1 md:space-y-2 bg-white/5 p-3 md:p-4 rounded-xl border border-white/5">
                            <ToggleButton
                                label="Particles"
                                enabled={graphics.showParticles}
                                onToggle={toggleParticles}
                            />
                            <ToggleButton
                                label="Screen Shake"
                                enabled={graphics.showScreenShake}
                                onToggle={toggleScreenShake}
                            />
                            <ToggleButton
                                label="Damage Numbers"
                                enabled={graphics.showDamageNumbers}
                                onToggle={toggleDamageNumbers}
                            />

                            {(device.isMobile || device.isTablet) && (
                                <>
                                    <div className="pt-3 md:pt-4 space-y-3 md:space-y-4 border-t border-white/5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs md:text-sm font-bold text-white uppercase tracking-tighter">HUD Scale</span>
                                            <span className="text-[10px] md:text-xs font-mono text-yellow-500">{Math.round(graphics.hudScale * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="1.5"
                                            step="0.05"
                                            value={graphics.hudScale}
                                            onChange={(e) => useGameStore.getState().setHudScale(parseFloat(e.target.value))}
                                            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                        />
                                    </div>
                                    <ToggleButton
                                        label="Show FPS"
                                        enabled={graphics.showFPS}
                                        onToggle={() => useGameStore.getState().toggleFPS()}
                                    />
                                </>
                            )}
                        </div>
                    </section>

                    {/* Controls Section */}
                    <section className="space-y-3 md:space-y-4">
                        <h3 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">Controls</h3>
                        <div className="grid grid-cols-2 gap-2 bg-white/5 p-3 md:p-4 rounded-xl border border-white/5">
                            <div className="flex flex-col">
                                <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase">Movement</span>
                                <span className="text-xs md:text-sm font-bold text-white font-mono leading-tight">WASD / ARROWS</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase">Dash</span>
                                <span className="text-xs md:text-sm font-bold text-white font-mono leading-tight">SPACE</span>
                            </div>
                            <div className="flex flex-col mt-1 md:mt-2">
                                <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase">Pause</span>
                                <span className="text-xs md:text-sm font-bold text-white font-mono leading-tight">ESC / P</span>
                            </div>
                            <div className="flex flex-col mt-1 md:mt-2">
                                <span className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase">Auto-Fire</span>
                                <span className="text-[8px] md:text-[10px] font-bold text-yellow-500/80 uppercase">Always On</span>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="flex gap-3 pt-4 md:pt-6 shrink-0 mt-auto">
                    <button
                        onClick={resetSettings}
                        className="flex-1 py-3 bg-slate-800 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-slate-700 hover:text-white transition-all border border-slate-700"
                    >
                        Reset
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-[2] py-3 bg-white text-black font-black uppercase tracking-[0.2em] text-xs rounded-xl hover:bg-yellow-500 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                        Close
                    </button>
                </div>

                <p className="text-center text-[8px] text-slate-600 font-bold uppercase tracking-[0.5em] mt-3 shrink-0">
                    Settings are saved automatically
                </p>
            </div>
        </div>
    );
};

// Toggle Button Component
interface ToggleButtonProps {
    label: string;
    enabled: boolean;
    onToggle: () => void;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({ label, enabled, onToggle }) => (
    <button
        onClick={onToggle}
        className="w-full flex justify-between items-center py-2 px-3 rounded-lg hover:bg-white/5 transition-all"
    >
        <span className="text-sm font-bold text-white">{label}</span>
        <div
            className={`w-10 h-5 rounded-full transition-all relative ${enabled ? 'bg-green-500' : 'bg-slate-600'
                }`}
        >
            <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all ${enabled ? 'left-5' : 'left-0.5'
                    }`}
            />
        </div>
    </button>
);
