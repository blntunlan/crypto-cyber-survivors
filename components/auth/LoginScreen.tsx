/**
 * LoginScreen - Modern authentication screen
 *
 * Supports:
 * - Email/Password sign in
 * - Email/Password sign up
 * - OAuth providers (Twitter, Google, Discord, GitHub)
 * - Magic link (passwordless)
 * - Password reset
 */

import React, { useState, useCallback } from 'react';
import {
  SupabaseAuthService,
  type AuthProvider,
} from '../../services/auth/SupabaseAuthService';
import { PhantomAuthService } from '../../services/auth/PhantomAuthService';

type AuthMode =
  | 'signIn'
  | 'signUp'
  | 'forgotPassword'
  | 'magicLink'
  | 'otpEmail'
  | 'otpVerify';

interface LoginScreenProps {
  onSuccess?: () => void;
  onClose?: () => void;
  initialMode?: AuthMode;
}

// OAuth Provider configurations
const OAUTH_PROVIDERS: {
  id: AuthProvider;
  name: string;
  icon: string;
  color: string;
}[] = [
  { id: 'google', name: 'Google', icon: '🔍', color: '#4285F4' },
  { id: 'discord', name: 'Discord', icon: '🎮', color: '#5865F2' },
  { id: 'twitter', name: 'Twitter/X', icon: '𝕏', color: '#000000' },
  { id: 'github', name: 'GitHub', icon: '🐙', color: '#333333' },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSuccess,
  onClose,
  initialMode = 'signIn',
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpEmail, setOtpEmail] = useState('');

  // Check if Phantom is installed
  const isPhantomInstalled = PhantomAuthService.isPhantomInstalled();

  // Handle Phantom wallet connect
  const handleWalletConnect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await PhantomAuthService.authenticate();

    setIsLoading(false);

    if (result.success && result.walletAddress) {
      setWalletAddress(result.walletAddress);
      setSuccessMessage(
        result.isNewUser
          ? `Yeni hesap oluşturuldu: ${PhantomAuthService.formatAddress(result.walletAddress)}`
          : `Giriş başarılı: ${PhantomAuthService.formatAddress(result.walletAddress)}`
      );
      setTimeout(() => onSuccess?.(), 1000);
    } else {
      setError(result.error ?? 'Wallet bağlantısı başarısız');
    }
  }, [onSuccess]);

  // Handle email/password sign in
  const handleSignIn = useCallback(async () => {
    if (!email || !password) {
      setError('Email ve şifre gereklidir');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await SupabaseAuthService.signIn({ email, password });

    setIsLoading(false);

    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error ?? 'Giriş başarısız');
    }
  }, [email, password, onSuccess]);

  // Handle email/password sign up
  const handleSignUp = useCallback(async () => {
    if (!email || !password) {
      setError('Email ve şifre gereklidir');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await SupabaseAuthService.signUp({
      email,
      password,
      displayName: displayName || undefined,
    });

    setIsLoading(false);

    if (result.success) {
      if (result.needsEmailConfirmation) {
        setSuccessMessage('Kayıt başarılı! Lütfen email adresinizi doğrulayın.');
      } else {
        onSuccess?.();
      }
    } else {
      setError(result.error ?? 'Kayıt başarısız');
    }
  }, [email, password, displayName, onSuccess]);

  // Handle password reset
  const handleForgotPassword = useCallback(async () => {
    if (!email) {
      setError('Email adresi gereklidir');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await SupabaseAuthService.resetPassword(email);

    setIsLoading(false);

    if (result.success) {
      setSuccessMessage('Şifre sıfırlama linki email adresinize gönderildi.');
    } else {
      setError(result.error ?? 'İşlem başarısız');
    }
  }, [email]);

  // Handle magic link
  const handleMagicLink = useCallback(async () => {
    if (!email) {
      setError('Email adresi gereklidir');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await SupabaseAuthService.sendMagicLink(email);

    setIsLoading(false);

    if (result.success) {
      setSuccessMessage('Giriş linki email adresinize gönderildi.');
    } else {
      setError(result.error ?? 'İşlem başarısız');
    }
  }, [email]);

  // Handle OTP send
  const handleOtpSend = useCallback(async () => {
    if (!email) {
      setError('Email adresi gereklidir');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await SupabaseAuthService.sendOtpCode(email);

    setIsLoading(false);

    if (result.success) {
      setOtpEmail(email);
      setOtpCode('');
      setMode('otpVerify');
      setSuccessMessage('6 haneli kod email adresinize gönderildi.');
    } else {
      setError(result.error ?? 'Kod gönderilemedi');
    }
  }, [email]);

  // Handle OTP verify
  const handleOtpVerify = useCallback(async () => {
    if (otpCode.length !== 6) {
      setError('Lütfen 6 haneli kodu girin');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await SupabaseAuthService.verifyOtpCode(otpEmail, otpCode);

    setIsLoading(false);

    if (result.success) {
      setSuccessMessage('Giriş başarılı!');
      setTimeout(() => onSuccess?.(), 500);
    } else {
      setError(result.error ?? 'Kod doğrulanamadı');
    }
  }, [otpCode, otpEmail, onSuccess]);

  // Handle OAuth sign in
  const handleOAuthSignIn = useCallback(async (provider: AuthProvider) => {
    setIsLoading(true);
    setError(null);

    const result = await SupabaseAuthService.signInWithOAuth({ provider });

    if (!result.success) {
      setIsLoading(false);
      setError(result.error ?? 'OAuth başarısız');
    }
    // If successful, user is redirected - no need to handle
  }, []);

  // Form submit handler
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      switch (mode) {
        case 'signIn':
          void handleSignIn();
          break;
        case 'signUp':
          void handleSignUp();
          break;
        case 'forgotPassword':
          void handleForgotPassword();
          break;
        case 'magicLink':
          void handleMagicLink();
          break;
        case 'otpEmail':
          void handleOtpSend();
          break;
        case 'otpVerify':
          void handleOtpVerify();
          break;
      }
    },
    [
      mode,
      handleSignIn,
      handleSignUp,
      handleForgotPassword,
      handleMagicLink,
      handleOtpSend,
      handleOtpVerify,
    ]
  );

  // Reset messages when changing mode
  const changeMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
    if (newMode !== 'otpVerify') {
      setOtpCode('');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '1.5rem',
          padding: '2rem',
          width: '100%',
          maxWidth: '420px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#fff',
              marginBottom: '0.5rem',
              fontFamily: "'Exo 2', sans-serif",
            }}
          >
            {mode === 'signIn' && 'Giriş Yap'}
            {mode === 'signUp' && 'Hesap Oluştur'}
            {mode === 'forgotPassword' && 'Şifre Sıfırla'}
            {mode === 'magicLink' && 'Şifresiz Giriş'}
            {mode === 'otpEmail' && 'Kod ile Giriş'}
            {mode === 'otpVerify' && 'Kodu Doğrula'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            {mode === 'signIn' && 'Hesabınıza giriş yapın'}
            {mode === 'signUp' && 'Yeni bir hesap oluşturun'}
            {mode === 'forgotPassword' &&
              'Email adresinize şifre sıfırlama linki göndereceğiz'}
            {mode === 'magicLink' && 'Email adresinize giriş linki göndereceğiz'}
            {mode === 'otpEmail' && 'Email adresinize 6 haneli kod göndereceğiz'}
            {mode === 'otpVerify' && `${otpEmail} adresine gönderilen kodu girin`}
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div
            style={{
              background: 'rgba(74, 222, 128, 0.1)',
              border: '1px solid rgba(74, 222, 128, 0.3)',
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              color: '#4ade80',
              fontSize: '0.875rem',
            }}
          >
            ✓ {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              color: '#ef4444',
              fontSize: '0.875rem',
            }}
          >
            ✗ {error}
          </div>
        )}

        {/* OAuth Providers (only for signIn/signUp) */}
        {(mode === 'signIn' || mode === 'signUp') && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              {OAUTH_PROVIDERS.map(provider => (
                <button
                  key={provider.id}
                  onClick={() => void handleOAuthSignIn(provider.id)}
                  disabled={isLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.5 : 1,
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={e => {
                    if (!isLoading) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = provider.color;
                    }
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>{provider.icon}</span>
                  {provider.name}
                </button>
              ))}
            </div>

            {/* Phantom Wallet Button */}
            <button
              onClick={() => {
                if (isPhantomInstalled) {
                  void handleWalletConnect();
                } else {
                  PhantomAuthService.openPhantomDownload();
                }
              }}
              disabled={isLoading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '0.875rem',
                background: 'linear-gradient(135deg, #AB9FF2 0%, #9945FF 100%)',
                border: 'none',
                borderRadius: '0.5rem',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1,
                transition: 'all 0.2s',
                marginBottom: '1rem',
              }}
              onMouseOver={e => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow =
                    '0 4px 20px rgba(153, 69, 255, 0.4)';
                }
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>👻</span>
              {isPhantomInstalled
                ? walletAddress
                  ? `Connected: ${PhantomAuthService.formatAddress(walletAddress)}`
                  : 'Phantom Wallet ile Bağlan'
                : 'Phantom Wallet Yükle'}
            </button>

            {/* Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  background: 'rgba(255, 255, 255, 0.1)',
                }}
              />
              <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.75rem' }}>
                veya email ile
              </span>
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  background: 'rgba(255, 255, 255, 0.1)',
                }}
              />
            </div>
          </>
        )}

        {/* Email Form */}
        <form onSubmit={handleSubmit}>
          {/* Display Name (only for signUp) */}
          {mode === 'signUp' && (
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                }}
              >
                Görünen İsim
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="CryptoMaster"
                maxLength={16}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.5rem',
                  color: '#fff',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#f7931a')}
                onBlur={e =>
                  (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)')
                }
              />
            </div>
          )}

          {/* Email (hide on OTP verify) */}
          {mode !== 'otpVerify' && (
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.5rem',
                  color: '#fff',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#f7931a')}
                onBlur={e =>
                  (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)')
                }
              />
            </div>
          )}

          {/* OTP Code Input */}
          {mode === 'otpVerify' && (
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                }}
              >
                6 Haneli Kod
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={otpCode}
                onChange={e =>
                  setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="123456"
                maxLength={6}
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.5rem',
                  color: '#fff',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  letterSpacing: '0.5rem',
                  textAlign: 'center',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#f7931a')}
                onBlur={e =>
                  (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)')
                }
              />
              <button
                type="button"
                onClick={() => void handleOtpSend()}
                disabled={isLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.75rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  marginTop: '0.5rem',
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                Kod gelmedi mi? Tekrar gönder
              </button>
            </div>
          )}

          {/* Password (not for forgotPassword/magicLink) */}
          {(mode === 'signIn' || mode === 'signUp') && (
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                }}
              >
                Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.5rem',
                  color: '#fff',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#f7931a')}
                onBlur={e =>
                  (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)')
                }
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: 'linear-gradient(90deg, #f7931a, #ff6b6b)',
              border: 'none',
              borderRadius: '0.5rem',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseOver={e => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(247, 147, 26, 0.4)';
              }
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isLoading
              ? 'İşleniyor...'
              : mode === 'signIn'
                ? 'Giriş Yap'
                : mode === 'signUp'
                  ? 'Kayıt Ol'
                  : mode === 'otpEmail'
                    ? 'Kod Gönder'
                    : mode === 'otpVerify'
                      ? 'Doğrula'
                      : 'Gönder'}
          </button>
        </form>

        {/* Mode Switchers */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          {mode === 'signIn' && (
            <>
              <button
                onClick={() => changeMode('forgotPassword')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  marginBottom: '0.5rem',
                  display: 'block',
                  width: '100%',
                }}
              >
                Şifremi unuttum
              </button>
              <button
                onClick={() => changeMode('magicLink')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  marginBottom: '0.5rem',
                  display: 'block',
                  width: '100%',
                }}
              >
                Şifresiz giriş (Magic Link)
              </button>
              <button
                onClick={() => changeMode('otpEmail')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  marginBottom: '0.5rem',
                  display: 'block',
                  width: '100%',
                }}
              >
                Email ile kod gönder
              </button>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                Hesabınız yok mu?{' '}
                <button
                  onClick={() => changeMode('signUp')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f7931a',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Kayıt ol
                </button>
              </p>
            </>
          )}

          {mode === 'signUp' && (
            <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              Zaten hesabınız var mı?{' '}
              <button
                onClick={() => changeMode('signIn')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#f7931a',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Giriş yap
              </button>
            </p>
          )}

          {(mode === 'forgotPassword' ||
            mode === 'magicLink' ||
            mode === 'otpEmail' ||
            mode === 'otpVerify') && (
            <button
              onClick={() => changeMode('signIn')}
              style={{
                background: 'none',
                border: 'none',
                color: '#f7931a',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              ← Giriş ekranına dön
            </button>
          )}
        </div>

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;
