/**
 * User and Session related types for the Beta User System.
 */

export interface StoredUser {
  playerId: string; // UUID from Supabase
  nickname: string; // Display name (3-16 chars)
  createdAt: number; // First login timestamp
  lastSeenAt: number; // Last session timestamp
}
