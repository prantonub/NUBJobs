import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { hashPassword } from '../utils/password.utils';
import { emitToUser } from '../lib/socket-server';
import {
  sendApplicationStatusEmail,
  sendJobStatusEmail,
  sendVerificationDecisionEmail,
} from '../services/email.service';

export interface AdminRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
}

const readSingleParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const readClientIp = (req: Request) =>
  (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
  req.ip ||
  req.socket?.remoteAddress ||
  null;

/** Write one audit row. Never throws — logging must not break the action. */
export async function logAdminAction(
  req: AdminRequest,
  action: string,
  resourceType: string,
  resourceId?: string | null,
  details?: string | null
) {
  try {
    const admin = req.userId
      ? await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true } })
      : null;
    await prisma.auditLog.create({
      data: {
        adminId: req.userId ?? 'unknown',
        adminName: admin?.name ?? req.email ?? 'admin',
        action,
        resourceType,
        resourceId: resourceId ?? null,
        details: details ?? null,
        ipAddress: readClientIp(req),
        userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
      },
    });
  } catch (error) {
    console.error('[admin-audit] failed to write audit log:', error);
  }
}

export const parsePageLimit = (query: Request['query']) => {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

export const paginationMeta = (total: number, page: number, limit: number) => ({
  page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)),
});

/** Tiers: SUPER_ADMIN = everything, MODERATOR = no admin/settings/audit, SUPPORT = disputes+messages. */
const TIER_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  CONTENT_MODERATOR: [
    'approve_job', 'reject_job', 'feature_job', 'delete_job',
    'verify_company', 'reject_company',
    'ban_user', 'reset_password', 'message_user',
    'resolve_dispute', 'view',
  ],
  SUPPORT_TEAM: ['resolve_dispute', 'message_user', 'view'],
};

async function getAdminTier(adminId: string): Promise<string> {
  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { adminRole: true } });
  return admin?.adminRole ?? 'SUPER_ADMIN';
}

/** 403 unless the caller's tier allows `permission`. SUPER_ADMIN always passes. */
export function requirePermission(permission: string) {
  return async (req: AdminRequest, res: Response, next: NextFunction) => {
    try {
      const tier = await getAdminTier(req.userId ?? '');
      const allowed = TIER_PERMISSIONS[tier] ?? [];
      if (allowed.includes('*') || allowed.includes(permission)) return next();
      return responses.forbidden(res, `Your admin role (${tier}) cannot perform this action`);
    } catch (error) {
      return next(error);
    }
  };
}

/** Notify one user (DB notification + real-time socket). Fire-and-forget safe. */
export async function notifyUser(userId: string, type: any, message: string, link?: string) {
  try {
    await prisma.notification.create({ data: { userId, type, message, link: link ?? null } });
    emitToUser(userId, 'admin_notification', { type, message, link: link ?? null });
  } catch (error) {
    console.error('[admin] notifyUser failed:', error);
  }
}
