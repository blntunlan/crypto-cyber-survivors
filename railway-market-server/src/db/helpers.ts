/**
 * Shared DB helpers — eliminates duplicate getProfileId across route files.
 */
import { eq } from 'drizzle-orm';
import { getDb } from './index';
import { profiles } from './schema';

/**
 * Resolve a profile's UUID from the JWT auth_user_id.
 * Returns null if no profile exists for this auth user.
 */
export async function getProfileId(authUserId: string): Promise<string | null> {
  const db = getDb();
  const result = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.authUserId, authUserId))
    .limit(1);
  return result[0]?.id ?? null;
}
