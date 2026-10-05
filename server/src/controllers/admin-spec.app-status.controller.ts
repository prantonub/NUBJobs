import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { emitToUser } from '../lib/socket-server';
import { sendApplicationStatusEmail } from '../services/email.service';
import { AdminRequest, logAdminAction, notifyUser } from './admin-spec.helpers';

/** PATCH /api/admin/applications/:id/status — transition + student email. */
export async function updateAdminApplicationStatus(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status, notes } = req.body as { status?: string; notes?: string };
    const normalized = String(status ?? '').toUpperCase();
    const allowed = ['APPLIED', 'REVIEWED', 'SHORTLISTED', 'INTERVIEWED', 'HIRED', 'REJECTED', 'WITHDRAWN'];
    if (!allowed.includes(normalized)) return responses.badRequest(res, `status must be one of ${allowed.join(', ')}`);
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        student: { select: { userId: true, user: { select: { email: true, name: true } } } },
        job: { select: { id: true, title: true } },
      },
    });
    if (!application) return responses.notFound(res, 'Application not found');

    const updated = await prisma.application.update({
      where: { id },
      data: {
        status: normalized as any,
        notes: notes ?? undefined,
        reviewedAt: application.reviewedAt ?? (normalized !== 'APPLIED' ? new Date() : undefined),
      },
    });

    const jobUrl = `${process.env.CLIENT_URL}/jobs/${application.job.id}`;
    await sendApplicationStatusEmail(application.student.user.email, application.student.user.name, application.job.title, normalized as any, jobUrl).catch(() => {});
    await notifyUser(application.student.userId, 'APPLICATION_STATUS_UPDATE', `Admin updated your application for "${application.job.title}" to ${normalized}`, '/dashboard/applications');
    emitToUser(application.student.userId, 'application_status_changed', { applicationId: id, status: normalized });
    await logAdminAction(req, 'update_application_status', 'application', id, normalized);

    return responses.ok(res, 'Application status updated', updated);
  } catch (error) {
    next(error);
  }
}
