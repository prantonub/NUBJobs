import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { emitToUser } from '../lib/socket-server';
import { sendVerificationDecisionEmail } from '../services/email.service';
import { AdminRequest, logAdminAction, notifyUser } from './admin-spec.helpers';

/** PATCH /api/admin/companies/:id/verify — badge + email + audit. (spec #15) */
export async function verifyCompany(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { notes } = req.body as { notes?: string };
    const existing = await prisma.employerProfile.findUnique({
      where: { id }, include: { user: { select: { id: true, email: true } } },
    });
    if (!existing) return responses.notFound(res, 'Company not found');
    const company = await prisma.employerProfile.update({
      where: { id }, data: { isVerified: true, verificationStatus: 'APPROVED', verifiedAt: new Date() },
    });
    await sendVerificationDecisionEmail(existing.user.email, existing.companyName, true, notes).catch(() => {});
    await notifyUser(existing.user.id, 'COMPANY_VERIFIED', `Your company "${existing.companyName}" is now verified`, '/employer/company');
    emitToUser(existing.user.id, 'company_verified', { companyName: existing.companyName });
    await logAdminAction(req, 'verify_company', 'company', id, notes ?? null);
    return responses.ok(res, 'Company verified', { ...company, verified: true });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/admin/companies/:id/reject-verification — reason + email + audit. (spec #16) */
export async function rejectCompanyVerification(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { reason } = req.body as { reason?: string };
    if (!reason?.trim()) return responses.badRequest(res, 'A rejection reason is required');
    const existing = await prisma.employerProfile.findUnique({
      where: { id }, include: { user: { select: { id: true, email: true } } },
    });
    if (!existing) return responses.notFound(res, 'Company not found');
    const company = await prisma.employerProfile.update({
      where: { id }, data: { isVerified: false, verificationStatus: 'REJECTED', verifiedAt: null },
    });
    await sendVerificationDecisionEmail(existing.user.email, existing.companyName, false, reason).catch(() => {});
    await notifyUser(existing.user.id, 'COMPANY_VERIFICATION_REJECTED', `Company verification rejected: ${reason}`, '/employer/company');
    emitToUser(existing.user.id, 'company_verification_rejected', { reason });
    await logAdminAction(req, 'reject_company', 'company', id, reason);
    return responses.ok(res, 'Company verification rejected', company);
  } catch (error) {
    next(error);
  }
}
