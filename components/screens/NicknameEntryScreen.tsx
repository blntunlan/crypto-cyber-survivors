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
      audio.playHit(); // Use hit sound for error
      return;
    }

    // 2. Submit
    setIsSubmitting(true);
    setError(null);
    audio.playLevelUp(); // Feedback for clicking button

    try {
      const result = await UserSessionService.registerNickname(nickname);

      if (result.success) {
        audio.playLevelUp(); // Success sound
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
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#3b82f633,transparent_70%)]" />
        <div className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 animate-pulse" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md relative"
      >
        {/* Decorative corner elements */}
        <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-blue-500 rounded-tl-xl" />
        <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-blue-500 rounded-br-xl" />

        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
          {/* Progress light top */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_10px_#3b82f6]" />

          <header className="text-center space-y-2 mb-8">
            <div className="inline-flex p-3 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
              <User className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
              Identify <span className="text-blue-500">Survivor</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-bold tracking-[0.3em] uppercase">
              Alpha Generation Protocol v1.0
            </p>
          </header>

          <form
            onSubmit={e => {
              void handleSubmit(e);
            }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Digital Alias
                </label>
                <span className="text-[10px] text-slate-500 font-black tracking-tighter">
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
                  placeholder="ENTER NICKNAME..."
                  className={`w-full bg-slate-950/50 border ${
                    error
                      ? 'border-red-500/50 text-red-400'
                      : 'border-white/10 text-white group-hover:border-blue-500/50'
                  } px-5 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-black tracking-wider uppercase placeholder:text-slate-800`}
                  maxLength={16}
                  disabled={isSubmitting}
                />
                <div
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition-opacity ${nickname.length >= 3 ? 'opacity-100' : 'opacity-0'}`}
                >
                  <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-1.5 text-red-500 text-[10px] font-bold uppercase tracking-tight pl-1"
                  >
                    <AlertCircle className="w-3 h-3" /> {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || nickname.length < 3}
              className={`w-full relative py-5 flex items-center justify-center gap-2 rounded-xl font-black text-sm uppercase tracking-[0.2em] transition-all group overflow-hidden ${
                nickname.length >= 3
                  ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_20px_#2563eb66]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  INITIALIZING...
                </div>
              ) : (
                <>
                  Connect{' '}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}

              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />
            </button>
          </form>

          <footer className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-[8px] text-slate-600 font-bold uppercase tracking-widest">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Mainnet Connected
            </div>
            <div>Build 1.0.0-Beta</div>
          </footer>
        </div>

        {/* Info hints */}
        <div className="mt-6 flex gap-4 justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/50 border border-white/5 rounded-full">
            <div className="w-1 h-1 bg-blue-500 rounded-full" />
            <span className="text-[8px] text-slate-500 font-bold uppercase">3-16 Characters</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/50 border border-white/5 rounded-full">
            <div className="w-1 h-1 bg-blue-500 rounded-full" />
            <span className="text-[8px] text-slate-500 font-bold uppercase">Alphanumeric</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
