import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserSessionService } from '../../services/auth/UserSessionService';
import { NicknameValidator } from '../../services/auth/NicknameValidator';
import { audio } from '../../services/audioService';
import { User, Shield, Zap, ChevronRight, AlertCircle } from 'lucide-react';

interface NicknameEntryScreenProps {
  onComplete: (nickname: string) => void;
}

export const NicknameEntryScreen: React.FC<NicknameEntryScreenProps> = ({ onComplete }) => {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    // 1. Validate
    const validationError = NicknameValidator.validate(nickname);
    if (validationError) {
      setError(validationError);
      audio.playHit();
      return;
    }

    // 2. Submit
    setIsSubmitting(true);
    setError(null);
    audio.playLevelUp();

    try {
      const result = await UserSessionService.registerNickname(nickname);

      if (result.success) {
        audio.playLevelUp();
        onComplete(nickname);
      } else {
        setError(result.error ?? 'Registration failed');
        audio.playHit();
      }
    } catch (_err) {
      setError('System error. Please try again.');
      audio.playHit();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950 px-6 font-mono overflow-hidden">
      {/* Background Effects - Cyan/Neon Theme */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Radial gradient glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(34,211,238,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.1),transparent_50%)]" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Animated scanline */}
        <motion.div
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
          animate={{
            top: ['0%', '100%'],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative"
      >
        {/* Decorative corner elements - Cyan theme */}
        <div className="absolute -top-3 -left-3 w-10 h-10 border-t-2 border-l-2 border-cyan-500/60 rounded-tl-lg" />
        <div className="absolute -top-3 -right-3 w-10 h-10 border-t-2 border-r-2 border-cyan-500/60 rounded-tr-lg" />
        <div className="absolute -bottom-3 -left-3 w-10 h-10 border-b-2 border-l-2 border-cyan-500/60 rounded-bl-lg" />
        <div className="absolute -bottom-3 -right-3 w-10 h-10 border-b-2 border-r-2 border-cyan-500/60 rounded-br-lg" />

        <div className="bg-slate-900/90 backdrop-blur-xl border border-cyan-500/20 p-8 rounded-xl shadow-2xl shadow-cyan-500/5 relative overflow-hidden">
          {/* Animated top border */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

          {/* Glow effect behind */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/10 via-purple-500/5 to-cyan-500/10 rounded-xl blur-xl opacity-50" />

          <header className="text-center space-y-3 mb-8 relative">
            {/* Icon with glow */}
            <motion.div
              className="inline-flex p-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/10 border border-cyan-500/30 mb-4 relative"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(34,211,238,0.2)',
                  '0 0 40px rgba(34,211,238,0.3)',
                  '0 0 20px rgba(34,211,238,0.2)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <User className="w-7 h-7 text-cyan-400" />
            </motion.div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              Identify{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300">
                Survivor
              </span>
            </h1>
            <p className="text-slate-500 text-[10px] font-bold tracking-[0.3em] uppercase">
              Beta Access Protocol v1.0
            </p>
          </header>

          <form
            onSubmit={e => {
              void handleSubmit(e);
            }}
            className="space-y-6 relative"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] text-cyan-400/80 font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Shield className="w-3 h-3" /> Callsign
                </label>
                <span
                  className={`text-[10px] font-black tracking-tighter transition-colors ${
                    nickname.length >= 3 ? 'text-cyan-400' : 'text-slate-600'
                  }`}
                >
                  {nickname.length}/16
                </span>
              </div>

              <div className="relative group">
                <input
                  autoFocus
                  type="text"
                  value={nickname}
                  onChange={e => {
                    setNickname(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter your nickname..."
                  className={`w-full bg-slate-950/80 border-2 ${
                    error
                      ? 'border-red-500/50 text-red-400 focus:ring-red-500/30'
                      : 'border-slate-700/50 text-white focus:border-cyan-500/50 group-hover:border-slate-600'
                  } px-5 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all font-semibold tracking-wide placeholder:text-slate-600 placeholder:font-normal`}
                  maxLength={16}
                  disabled={isSubmitting}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />

                {/* Valid indicator */}
                <motion.div
                  className={`absolute right-4 top-1/2 -translate-y-1/2`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{
                    opacity: nickname.length >= 3 ? 1 : 0,
                    scale: nickname.length >= 3 ? 1 : 0.5,
                  }}
                >
                  <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                </motion.div>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 text-red-400 text-xs font-medium pl-1"
                  >
                    <AlertCircle className="w-3.5 h-3.5" /> {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting || nickname.length < 3}
              className={`w-full relative py-4 flex items-center justify-center gap-2 rounded-lg font-bold text-sm tracking-wide transition-all group overflow-hidden ${
                nickname.length >= 3
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:from-cyan-500 hover:to-cyan-400 shadow-lg shadow-cyan-500/25'
                  : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/50'
              }`}
              whileHover={nickname.length >= 3 ? { scale: 1.02 } : {}}
              whileTap={nickname.length >= 3 ? { scale: 0.98 } : {}}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting...</span>
                </div>
              ) : (
                <>
                  <span>Enter the Arena</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}

              {/* Shine effect */}
              {nickname.length >= 3 && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatDelay: 2,
                    ease: 'easeInOut',
                  }}
                />
              )}
            </motion.button>
          </form>

          <footer className="mt-8 pt-6 border-t border-slate-700/30 flex justify-between items-center text-[9px] text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <motion.div
                className="w-2 h-2 bg-green-500 rounded-full"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span>Systems Online</span>
            </div>
            <div className="text-slate-600">Crypto Cyber Survivors</div>
          </footer>
        </div>

        {/* Info hints */}
        <div className="mt-6 flex gap-3 justify-center">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/60 border border-slate-700/30 rounded-full backdrop-blur-sm">
            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
            <span className="text-[9px] text-slate-400 font-medium">3-16 Characters</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/60 border border-slate-700/30 rounded-full backdrop-blur-sm">
            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
            <span className="text-[9px] text-slate-400 font-medium">Letters & Numbers</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
