/**
 * AuthErrorMapper - Maps Supabase auth error messages to user-friendly Turkish messages.
 */

const AUTH_ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Email veya şifre hatalı',
  'Email not confirmed': 'Lütfen email adresinizi doğrulayın',
  'User already registered': 'Bu email zaten kayıtlı',
  'Password should be at least 6 characters': 'Şifre en az 6 karakter olmalı',
  'Unable to validate email address: invalid format': 'Geçersiz email formatı',
  'For security purposes, you can only request this once every 60 seconds':
    'Güvenlik nedeniyle 60 saniye beklemeniz gerekiyor',
  'Email rate limit exceeded': 'Çok fazla deneme yaptınız, lütfen bekleyin',
  'New password should be different from the old password':
    'Yeni şifre eskisinden farklı olmalı',
  'Auth session missing!': 'Oturum bulunamadı, lütfen tekrar giriş yapın',
};

export function mapAuthError(message: string): string {
  return AUTH_ERROR_MAP[message] ?? message;
}
