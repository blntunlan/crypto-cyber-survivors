import { query } from '../db/pool.js';
import { Logger } from './logger.js';

export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.token_refresh'
  | 'auth.failed'
  | 'profile.create'
  | 'profile.update'
  | 'identity.link'
  | 'identity.unlink'
  | 'wallet.credit'
  | 'wallet.spend'
  | 'session.start'
  | 'session.verify'
  | 'session.suspicious'
  | 'session.recover';

interface AuditEntry {
  profileId?: string | null;
  action: AuditAction;
  resource: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_log (profile_id, action, resource, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        entry.profileId || null,
        entry.action,
        entry.resource,
        JSON.stringify(entry.details || {}),
        entry.ipAddress || null,
        entry.userAgent || null,
      ]
    );
  } catch (err) {
    // Audit logging should never break the main flow
    Logger.error('[AuditLogger] Failed to write audit log', err);
  }
}

// Helper to extract client info from Express request
export function getClientInfo(req: { headers: Record<string, string | string[] | undefined>; ip?: string }) {
  return {
    ipAddress: (req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()) || req.ip || 'unknown',
    userAgent: req.headers['user-agent']?.toString() || 'unknown',
  };
}
