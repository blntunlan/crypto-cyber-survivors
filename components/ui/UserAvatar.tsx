/**
 * UserAvatar - Displays user profile picture with OAuth provider fallbacks
 *
 * Features:
 * - Shows OAuth avatar (Twitter, Google, Discord, GitHub)
 * - Generates fallback avatar based on display name initials
 * - Provider-specific badges (optional)
 * - Loading states with skeleton
 * - Online status indicator (optional)
 */

import React, { useState, useMemo } from 'react';
import {
  Apple,
  AtSign,
  Code2,
  Disc,
  Mail,
  Search,
  Tv,
  User,
  type LucideIcon,
} from 'lucide-react';
import type { AuthProvider } from '../../services/auth/RailwayAuthService';

// ============================================
// Types
// ============================================

export interface UserAvatarProps {
  /** Avatar URL from OAuth provider */
  avatarUrl?: string | null;
  /** Display name for fallback initials */
  displayName: string;
  /** Size of the avatar */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Auth provider for badge (optional) */
  provider?: AuthProvider | 'email' | 'nickname' | null;
  /** Show provider badge */
  showProviderBadge?: boolean;
  /** Show online status indicator */
  isOnline?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

// ============================================
// Constants
// ============================================

const SIZE_CLASSES: Record<
  'xs' | 'sm' | 'md' | 'lg' | 'xl',
  { container: string; text: string; badge: string }
> = {
  xs: {
    container: 'w-6 h-6',
    text: 'text-xs',
    badge: 'w-3 h-3 -bottom-0.5 -right-0.5',
  },
  sm: {
    container: 'w-8 h-8',
    text: 'text-sm',
    badge: 'w-4 h-4 -bottom-0.5 -right-0.5',
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-base',
    badge: 'w-5 h-5 -bottom-1 -right-1',
  },
  lg: {
    container: 'w-12 h-12',
    text: 'text-lg',
    badge: 'w-6 h-6 -bottom-1 -right-1',
  },
  xl: {
    container: 'w-16 h-16',
    text: 'text-xl',
    badge: 'w-7 h-7 -bottom-1.5 -right-1.5',
  },
};

const PROVIDER_ICONS: Record<string, { icon: LucideIcon; bg: string; color: string }> =
  {
    twitter: { icon: AtSign, bg: 'bg-black', color: 'text-white' },
    google: { icon: Search, bg: 'bg-white', color: 'text-[#4285F4]' },
    discord: { icon: Disc, bg: 'bg-[#5865F2]', color: 'text-white' },
    github: { icon: Code2, bg: 'bg-[#24292e]', color: 'text-white' },
    apple: { icon: Apple, bg: 'bg-black', color: 'text-white' },
    twitch: { icon: Tv, bg: 'bg-[#9146FF]', color: 'text-white' },
    email: { icon: Mail, bg: 'bg-gray-600', color: 'text-white' },
    nickname: { icon: User, bg: 'bg-cyan-600', color: 'text-white' },
  };

// Fallback avatar colors based on name hash
const AVATAR_COLORS = [
  'from-cyan-500 to-blue-500',
  'from-purple-500 to-pink-500',
  'from-green-500 to-teal-500',
  'from-orange-500 to-red-500',
  'from-indigo-500 to-purple-500',
  'from-yellow-500 to-orange-500',
  'from-pink-500 to-rose-500',
  'from-teal-500 to-cyan-500',
];

// ============================================
// Helpers
// ============================================

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    const first = words[0]?.[0] ?? '';
    const second = words[1]?.[0] ?? '';
    if (first || second) return (first + second).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || '?';
}

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (
    AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? 'from-cyan-500 to-blue-500'
  );
}

// ============================================
// Component
// ============================================

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  displayName,
  size = 'md',
  provider,
  showProviderBadge = false,
  isOnline,
  className = '',
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeClasses = SIZE_CLASSES[size];
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const colorGradient = useMemo(() => getColorFromName(displayName), [displayName]);
  const providerInfo = provider ? PROVIDER_ICONS[provider] : null;

  const hasValidImage = avatarUrl && !imageError;
  const ProviderIcon = providerInfo?.icon;

  const Container = onClick ? 'button' : 'div';
  const containerProps = onClick ? { type: 'button' as const, onClick } : {};

  return (
    <Container
      {...containerProps}
      className={`relative inline-flex outline-none ${onClick ? 'cursor-pointer appearance-none rounded-full border-none bg-transparent p-0 text-left focus-visible:ring-2 focus-visible:ring-cyan-500' : ''} ${className}`}
    >
      {/* Avatar Container */}
      <div
        className={`
          ${sizeClasses.container}
          flex
          items-center
          justify-center overflow-hidden rounded-full
          border-2 border-white/20
          shadow-lg
          ${!hasValidImage ? `bg-gradient-to-br ${colorGradient}` : 'bg-gray-800'}
          transition-transform duration-200
          ${onClick ? 'hover:scale-110' : ''}
        `}
      >
        {/* OAuth Avatar Image */}
        {hasValidImage && (
          <img
            src={avatarUrl}
            alt={displayName}
            className={`
              h-full w-full object-cover
              ${imageLoaded ? 'opacity-100' : 'opacity-0'}
              transition-opacity duration-300
            `}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}

        {/* Fallback Initials */}
        {(!hasValidImage || !imageLoaded) && (
          <span
            className={`
              ${sizeClasses.text}
              select-none font-bold
              text-white
              ${hasValidImage && !imageLoaded ? 'absolute' : ''}
            `}
          >
            {initials}
          </span>
        )}
      </div>

      {/* Provider Badge */}
      {showProviderBadge && providerInfo && ProviderIcon && (
        <div
          className={`
            absolute ${sizeClasses.badge}
            rounded-full
            ${providerInfo.bg} ${providerInfo.color}
            flex items-center justify-center
            border
            border-gray-900
            shadow-md
          `}
          title={`Signed in with ${provider}`}
        >
          <ProviderIcon className="h-2.5 w-2.5" strokeWidth={2.5} />
        </div>
      )}

      {/* Online Status Indicator */}
      {isOnline !== undefined && (
        <div
          className={`
            absolute bottom-0 right-0
            h-3 w-3 rounded-full
            ${isOnline ? 'bg-green-500' : 'bg-gray-500'}
            border-2 border-gray-900
          `}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </Container>
  );
};

// ============================================
// Default Export
// ============================================

export default UserAvatar;
