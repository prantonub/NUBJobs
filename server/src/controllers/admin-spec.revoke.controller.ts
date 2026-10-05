import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { AdminRequest, logAdminAction, notifyUser } from './admin-spec.helpers';

/** PATCH /api/admin/companies/:id/revoke — badge removed + audit. */
export async function revokeCompanyVerification(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { reason } = req.body as { reason?: string };
    const existing = await prisma.employerProfile.findUnique({
      where: { id }, include: { user: { select: { id: true } } },
    });
    if (!existing) return responses.notFound(res, 'Company not found');
    const company = await prisma.employerProfile.update({
      where: { id }, data: { isVerified: false, verificationStatus: 'REJECTED', verifiedAt: null },
    });
    await notifyUser(existing.user.id, 'COMPANY_VERIFICATION_REJECTED', `Badge revoked${reason ? `: ${reason}` : ''}`, '/employer/company');
    await logAdminAction(req, 'revoke_verification', 'company', id, reason ?? null);
    return responses.ok(res, 'Verification badge revoked', company);
  } catch (error) {
    next(error);
  }
}
