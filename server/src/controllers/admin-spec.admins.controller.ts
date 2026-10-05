import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { hashPassword } from '../utils/password.utils';
import { AdminRequest, logAdminAction } from './admin-spec.helpers';

/** GET /api/admin/admins — SUPER_ADMIN lists admin accounts. */
export async function listAdmins(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MODERATOR'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, adminRole: true, isBanned: true, createdAt: true },
    });
    return responses.ok(res, 'Admins fetched', admins);
  } catch (error) {
    next(error);
  }
}

/** POST /api/admin/admins — SUPER_ADMIN creates an admin (temp password). */
export async function createAdminAccount(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const { email, name, password, adminRole } = req.body as { email?: string; name?: string; password?: string; adminRole?: string };
    if (!email?.trim() || !name?.trim()) return responses.badRequest(res, 'Email and name are required');
    const tier = String(adminRole ?? 'SUPPORT_TEAM').toUpperCase();
    if (!['SUPER_ADMIN', 'CONTENT_MODERATOR', 'SUPPORT_TEAM'].includes(tier)) {
      return responses.badRequest(res, 'adminRole must be SUPER_ADMIN, CONTENT_MODERATOR or SUPPORT_TEAM');
    }
    const tempPassword = password?.trim() || `NubAdmin-${crypto.randomBytes(4).toString('hex')}!`;
    const admin = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(), name: name.trim(),
        password: await hashPassword(tempPassword),
        role: 'ADMIN', adminRole: tier, isEmailVerified: true,
      },
      select: { id: true, name: true, email: true, role: true, adminRole: true },
    });
    await logAdminAction(req, 'create_admin', 'user', admin.id, `${admin.email} (${tier})`);
    return responses.created(res, 'Admin created', { ...admin, tempPassword: password ? undefined : tempPassword });
  } catch (error: any) {
    if (error?.code === 'P2002') return responses.conflict(res, 'An account with this email already exists');
    next(error);
  }
}

/** GET /api/admin/settings — platform config with safe defaults. */
const DEFAULT_SETTINGS: Record<string, string> = {
  platformName: 'NUBJobs',
  platformDescription: 'Jobs for Northern University Bangladesh students and alumni.',
  supportEmail: 'support@nubjobs.online',
  contactPhone: '',
  requireJobApproval: 'true',
  autoApproveHours: '24',
  minJobTitleLength: '10',
  minJobDescriptionLength: '50',
  maxFeaturedJobs: '5',
};

export async function getPlatformSettings(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.platformSetting.findMany();
    const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of rows) settings[row.key] = row.value;
    return responses.ok(res, 'Platform settings fetched', settings);
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/admin/settings — upsert keys + audit. */
export async function updatePlatformSettings(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const entries = Object.entries(req.body as Record<string, unknown>)
      .filter(([k, v]) => typeof k === 'string' && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'));
    if (!entries.length) return responses.badRequest(res, 'No settings provided');
    for (const [key, value] of entries) {
      await prisma.platformSetting.upsert({
        where: { key },
        update: { value: String(value), updatedBy: req.userId ?? null },
        create: { key, value: String(value), updatedBy: req.userId ?? null },
      });
    }
    await logAdminAction(req, 'update_settings', 'setting', null, entries.map(([k]) => k).join(','));
    return getPlatformSettings(req, res, next);
  } catch (error) {
    next(error);
  }
}
