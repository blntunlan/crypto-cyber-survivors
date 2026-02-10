import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/useAuthStore';
import { AuthService } from '../../services/auth/AuthService';
import { AuthCard } from './ui/AuthCard';
import { AuthInput } from './ui/AuthInput';
import { AuthButton } from './ui/AuthButton';

type LoginTab = 'otp' | 'password';

export const AuthScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LoginTab>('otp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');

  const { authStage, loading, error, setError } = useAuthStore();

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email.');
      return;
    }
    await AuthService.signInWithOtp(email);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    await AuthService.signInWithPassword(email, password);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpToken) {
      setError('Please enter the code.');
      return;
    }
    await AuthService.verifyOtp(email, otpToken);
  };

  const renderSocialButtons = () => (
    <div className="mt-6">
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-slate-900 px-2 uppercase tracking-wide text-slate-500">
            Or connect with
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <AuthButton
          variant="secondary"
          onClick={() => void AuthService.signInWithOAuth('google')}
        >
          Google
        </AuthButton>
        <AuthButton
          variant="secondary"
          onClick={() => void AuthService.signInWithOAuth('discord')}
        >
          Discord
        </AuthButton>
      </div>
    </div>
  );

  const renderTabs = () => (
    <div className="mb-6 flex border-b border-slate-700">
      <button
        className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors duration-200 ${
          activeTab === 'otp'
            ? 'border-b-2 border-cyan-400 text-cyan-400'
            : 'text-slate-500 hover:text-white'
        }`}
        onClick={() => setActiveTab('otp')}
      >
        Email Code (OTP)
      </button>
      <button
        className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors duration-200 ${
          activeTab === 'password'
            ? 'border-b-2 border-cyan-400 text-cyan-400'
            : 'text-slate-500 hover:text-white'
        }`}
        onClick={() => setActiveTab('password')}
      >
        Password
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-black bg-[url('/assets/bg/grid.png')] bg-cover p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md">
        <AnimatePresence mode="wait">
          {authStage === 'LOGIN' && (
            <AuthCard title="System Access" key="login">
              {renderTabs()}

              <AnimatePresence mode="wait">
                {activeTab === 'otp' ? (
                  <motion.form
                    key="otp-form"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onSubmit={e => void handleOtpSubmit(e)}
                  >
                    <AuthInput
                      label="Email Address"
                      placeholder="Enter your email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                    <AuthButton type="submit" loading={loading}>
                      Send Magic Code
                    </AuthButton>
                  </motion.form>
                ) : (
                  <motion.form
                    key="password-form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={e => void handlePasswordSubmit(e)}
                  >
                    <AuthInput
                      label="Email Address"
                      placeholder="Enter your email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                    <AuthInput
                      label="Password"
                      placeholder="Enter your password"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <AuthButton type="submit" loading={loading}>
                      Sign In
                    </AuthButton>
                  </motion.form>
                )}
              </AnimatePresence>

              {renderSocialButtons()}
            </AuthCard>
          )}

          {authStage === 'OTP_VERIFY' && (
            <AuthCard title="Verify Identity" key="verify">
              <p className="mb-6 text-center text-sm text-slate-400">
                Enter the 6-digit code sent to{' '}
                <span className="text-cyan-400">{email}</span>
              </p>

              <form onSubmit={e => void handleVerifyOtp(e)}>
                <AuthInput
                  label="Verification Code"
                  placeholder="Enter 6-digit code"
                  value={otpToken}
                  onChange={e => setOtpToken(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-[0.5em]"
                />
                <AuthButton type="submit" loading={loading}>
                  Verify Code
                </AuthButton>

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => useAuthStore.getState().setStage('LOGIN')}
                    className="text-xs text-slate-500 underline hover:text-cyan-400"
                  >
                    Go Back
                  </button>
                </div>
              </form>
            </AuthCard>
          )}
        </AnimatePresence>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded border border-red-500/50 bg-red-500/10 p-3 text-center text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}
      </div>
    </div>
  );
};
