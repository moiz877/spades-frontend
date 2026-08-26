import type { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * Single-shared-password gate for the admin lead views. This is
 * appropriate for a solo operator, not a team — it's one password, not
 * per-user accounts, and has no audit log. If more than one person needs
 * access, replace this with real auth (NextAuth/Clerk) before then.
 */
export function isAdminAuthorized(req: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!provided) return false;

  // Constant-time comparison to avoid leaking the password via timing.
  const a = Buffer.from(provided);
  const b = Buffer.from(adminPassword);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
