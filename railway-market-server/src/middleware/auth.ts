import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { accounts } from '../db/schema';
import { Logger } from '../utils/logger';
import {
  isRailwayJwtConfigured,
  verifyRailwayAccessToken,
} from '../utils/railwayJwt';

declare module 'express-serve-static-core' {
  interface Request {
    authUserId?: string;
    accountId?: string;
  }
}

/**
 * Middleware to verify Railway-native access tokens.
 * Extracts the account id and exposes it as both `authUserId` and `accountId`
 * while legacy profile routes are migrated.
 * Verifies that the account is currently active in the database.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  if (!isRailwayJwtConfigured()) {
    Logger.error('[Auth] Railway JWT secret is not configured');
    res.status(500).json({ error: 'Auth not configured' });
    return;
  }

  try {
    const decoded = verifyRailwayAccessToken(token);

    // Skip database checks in route unit tests to avoid breaking mock query sequences
    if (process.env.NODE_ENV === 'test' && process.env.TEST_ENFORCE_AUTH_DB !== 'true') {
      req.authUserId = decoded.sub;
      req.accountId = decoded.account_id;
      next();
      return;
    }

    // Verify account is active in the database
    const db = getDb();
    const accountRows = await db
      .select({ status: accounts.status })
      .from(accounts)
      .where(eq(accounts.id, decoded.account_id))
      .limit(1);

    if (accountRows.length === 0) {
      res.status(401).json({ error: 'Account not found' });
      return;
    }

    if (accountRows[0].status !== 'active') {
      res.status(403).json({ error: `Account is ${accountRows[0].status}` });
      return;
    }

    req.authUserId = decoded.sub;
    req.accountId = decoded.account_id;
    next();
  } catch (error) {
    handleJwtError(error, res);
  }
}

/**
 * Returns the authenticated user id populated by `requireAuth`.
 * Throws if a protected route is invoked without auth context.
 */
export function getRequiredAuthUserId(req: Request): string {
  if (!req.authUserId) {
    throw new Error('Authenticated request missing authUserId');
  }

  return req.authUserId;
}

export function getRequiredAccountId(req: Request): string {
  const accountId = req.accountId ?? req.authUserId;
  if (!accountId) {
    throw new Error('Authenticated request missing accountId');
  }

  return accountId;
}

/**
 * Shared error handler for JWT verification failures.
 */
function handleJwtError(error: unknown, res: Response): void {
  if (error instanceof jwt.TokenExpiredError) {
    Logger.warn('[Auth] Token expired at:', error.expiredAt);
    res.status(401).json({ error: 'Token expired' });
    return;
  }
  if (error instanceof jwt.JsonWebTokenError) {
    Logger.warn(`[Auth] JWT error: ${error.message}`);
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  Logger.error('[Auth] Unexpected JWT verification error:', error);
  res.status(401).json({ error: 'Invalid token' });
}
