/**
 * Profile Types - Type definitions for player profiling and statistics
 */

import { type AuthProvider } from '../services/auth/SupabaseAuthService';

export interface PlayerStats {
  totalKills: number;
  totalSurvivalTime: number; // seconds
  totalGames: number;
  maxSurvivalTime: number; // seconds
  maxKills: number;
  totalGoldEarned: number;
  goldBalance: number;
  gemsBalance: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'combat' | 'survival' | 'trading' | 'misc';
  iconKey: string;
  conditionType: 'total_kills' | 'survival_seconds' | 'max_level' | 'pnl_percent';
  conditionValue: number;
  rewardGold: number;
  isActive: boolean;
}

export interface ProfileAchievement {
  id: string;
  profileId: string;
  achievementId: string;
  unlockedAt: string;
  formattedDate: string;
}

export interface FullProfileData {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  level: number;
  xp: number;
  isTester: boolean;
  primaryAuthProvider: AuthProvider | 'nickname';
  createdAt: string;
  stats: PlayerStats;
  achievements: {
    unlocked: ProfileAchievement[];
    all: Achievement[];
  };
}
