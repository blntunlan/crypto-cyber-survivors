import React, { useState } from 'react';
import { audio } from '../services/audioService';

interface SettingsPanelProps {
    onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
    const [volume, setVolume] = useState(audio.getVolume());
    const [isMuted, setIsMuted] = useState(audio.getMuted());

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        audio.setVolume(newVolume);
    };

    const handleMuteToggle = () => {
        const newMute = audio.toggleMute();
        setIsMuted(newMute);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-slate-900/50 border border-white/10 rounded-3xl p-8 space-y-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <header className="text-center">
                    <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase italic">
                        Settings
                    </h2>
                    <div className="h-1 w-12 bg-yellow-500 mx-auto mt-2 rounded-full" />
                </header>

                <div className="space-y-6">
                    {/* Audio Section */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Audio</h3>

                        <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-white uppercase">Master Volume</span>
                                <span className="text-xs font-mono text-slate-400">{Math.round(volume * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={handleVolumeChange}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                            />

                            <button
                                onClick={handleMuteToggle}
                                className={`w-full py-2 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all border ${isMuted
                                    ? 'bg-red-500/10 border-red-500/50 text-red-500'
                                    : 'bg-green-500/10 border-green-500/50 text-green-500'
                                    }`}
                            >
                                Mute: {isMuted ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </section>

                    {/* Controls Section */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Controls</h3>
                        <div className="grid grid-cols-2 gap-2 bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Movement</span>
                                <span className="text-sm font-bold text-white font-mono">WASD / ARROWS</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Pause</span>
                                <span className="text-sm font-bold text-white font-mono">ESC / P</span>
                            </div>
                            <div className="flex flex-col mt-2">
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Auto-Fire</span>
                                <span className="text-[10px] font-bold text-yellow-500/80 uppercase">Always On</span>
                            </div>
                        </div>
                    </section>

                    {/* Quality Section (Placeholder) */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Graphics</h3>
                        <div className="flex gap-2 bg-white/5 p-2 rounded-xl border border-white/5">
                            {['Low', 'Medium', 'High'].map((q) => (
                                <button
                                    key={q}
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter border transition-all ${q === 'High'
                                        ? 'bg-white/10 border-white/20 text-white'
                                        : 'border-transparent text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </section>
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-4 bg-white text-black font-black uppercase tracking-[0.2em] rounded-xl hover:bg-yellow-500 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                    Close
                </button>

                <p className="text-center text-[8px] text-slate-600 font-bold uppercase tracking-[0.5em]">
                    v1.0.4-beta // System Stack Stable
                </p>
            </div>
        </div>
    );
};
