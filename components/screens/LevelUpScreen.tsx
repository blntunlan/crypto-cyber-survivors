import React from 'react';
import { Card } from '../../services/CardSystem';
import { COLORS } from '../../constants';
import { TIER_CONFIG } from '../../services/CardSystem';
import { IconMarketChart, IconAlphaEye, IconFlashPulse, IconGenesisEmblem, IconShield, IconDiamond, IconRocket, IconApe, IconBolt, IconMagnet, IconSkull, IconWhale, IconBanano } from '../icons/CardIcons';

interface LevelUpScreenProps {
    upgradeChoices: Card[];
    onSelect: (card: Card) => void;
}

export const LevelUpScreen: React.FC<LevelUpScreenProps> = ({ upgradeChoices, onSelect }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
            <div className="max-w-4xl w-full my-auto">
                <div className="text-center mb-6 md:mb-10">
                    <h3 className="text-4xl md:text-5xl font-black italic text-white tracking-tighter">LEVEL UP</h3>
                    <p className="font-bold uppercase text-xs mt-2" style={{ color: COLORS.ELECTRIC_BLUE }}>
                        Choose your upgrade - Luck affects rarity!
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {upgradeChoices.map(card => {
                        const tierConfig = TIER_CONFIG[card.tier];
                        return (
                            <button
                                key={card.id}
                                onClick={() => onSelect(card)}
                                className="group flex flex-col items-center text-center p-4 md:p-8 rounded-2xl transition-all hover:scale-105"
                                style={{
                                    backgroundColor: tierConfig.bgColor,
                                    borderWidth: '2px',
                                    borderStyle: 'solid',
                                    borderColor: tierConfig.borderColor,
                                    boxShadow:
                                        card.tier !== 'common' ? `0 0 20px ${tierConfig.glowColor}40` : 'none',
                                }}
                            >
                                <div
                                    className="text-[10px] font-black uppercase tracking-widest mb-2"
                                    style={{ color: tierConfig.color }}
                                >
                                    {tierConfig.name}
                                </div>

                                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform flex items-center justify-center w-24 h-24 relative">
                                    {/* Icon Background Glow */}
                                    <div
                                        className="absolute inset-0 rounded-full blur-2xl opacity-20"
                                        style={{ backgroundColor: tierConfig.color }}
                                    ></div>

                                    {card.icon === 'icon-market-chart' ? (
                                        <IconMarketChart className="w-16 h-16 relative z-10" color={tierConfig.color} />
                                    ) : card.icon === 'icon-alpha-eye' ? (
                                        <IconAlphaEye className="w-16 h-16 relative z-10" color={tierConfig.color} />
                                    ) : card.icon === 'icon-flash-pulse' ? (
                                        <IconFlashPulse className="w-16 h-16 relative z-10" color={tierConfig.color} />
                                    ) : card.icon === 'icon-genesis-emblem' ? (
                                        <IconGenesisEmblem className="w-20 h-20 relative z-10" color={tierConfig.color} />
                                    ) : card.icon === 'icon-shield' ? (
                                        <IconShield className="w-16 h-16 relative z-10" color={tierConfig.color} />
                                    ) : card.icon === 'icon-diamond' ? (
                                        <IconDiamond className="w-16 h-16 relative z-10" color={tierConfig.color} />
                                    ) : card.icon === 'icon-rocket' ? (
                                        <IconRocket className="w-16 h-16 relative z-10" color={tierConfig.color} />
                                    ) : card.icon === 'icon-ape' ? (
                                        <IconApe className="w-16 h-16 relative z-10" color={tierConfig.color} />
                                    ) : card.icon === 'icon-bolt' ? (
                                        <IconBolt className="w-16 h-16 relative z-10" color={tierConfig.color} />
                                    ) : card.icon === 'icon-magnet' ? (
                                        <IconMagnet className="w-16 h-16 relative z-10" color={tierConfig.color} />
                                    ) : card.icon === 'icon-skull' ? (
                                        <IconSkull className="w-16 h-16 relative z-10" color={tierConfig.color} />
                                    ) : card.icon === 'icon-whale' ? (
                                        <IconWhale className="w-16 h-16 relative z-10" color={tierConfig.color} />
                                    ) : card.icon === 'icon-banano' ? (
                                        <IconBanano className="w-16 h-16 relative z-10" color="#FBDD11" />
                                    ) : card.icon.startsWith('/') ? (
                                        <img
                                            src={card.icon}
                                            alt={card.name}
                                            className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] relative z-10"
                                        />
                                    ) : (
                                        <span className="relative z-10">{card.icon}</span>
                                    )}
                                </div>

                                <div
                                    className="text-lg font-black mb-2 uppercase"
                                    style={{ color: tierConfig.color }}
                                >
                                    {card.name}
                                </div>

                                <div className="text-xs text-slate-400 font-bold">{card.description}</div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
