import React, { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { ProfileService } from '../../services/profile/ProfileService';
import { AuthCard } from './ui/AuthCard';
import { AuthInput } from './ui/AuthInput';
import { AuthButton } from './ui/AuthButton';
import { motion } from 'framer-motion';

export const NicknameSetup: React.FC = () => {
  const [nickname, setNickname] = useState('');
  const { user, loading, setLoading, error, setError, setStage } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      setError('Nickname is required.');
      return;
    }

    if (trimmedNickname.length < 3) {
      setError('Nickname must be at least 3 characters.');
      return;
    }

    if (!user) {
      setError('User session not found.');
      return;
    }

    try {
      setLoading(true);
      await ProfileService.updateNickname(user.id, trimmedNickname);
      setStage('COMPLETE');
    } catch (err) {
      // Error is already set in store by service catch block,
      // but if we call service method that throws, we catch it here.
      // However, ProfileService.updateNickname throws, so we catch it.
      const errorMessage = (err as Error).message ?? 'Failed to update nickname.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black bg-[url('/assets/bg/grid.png')] bg-cover p-4 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)]">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md">
        <AuthCard title="Identity Protocol">
          <p className="mb-8 text-center text-slate-400">
            Establish your digital presence in the{' '}
            <span className="text-cyan-400">Crypto Survivors</span> network.
          </p>

          <form onSubmit={e => void handleSubmit(e)}>
            <AuthInput
              label="Operative Alias"
              placeholder="Enter alias..."
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={20}
              className="text-center text-xl tracking-wider"
            />

            <AuthButton type="submit" loading={loading} className="mt-4">
              Initialize
            </AuthButton>
          </form>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 rounded border border-red-500/50 bg-red-500/10 p-3 text-center font-mono text-sm text-red-400"
            >
              ⚠ {error}
            </motion.div>
          )}
        </AuthCard>
      </div>
    </div>
  );
};
