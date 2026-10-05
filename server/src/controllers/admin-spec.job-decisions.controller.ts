import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { emitToUser } from '../lib/socket-server';
import { sendJobStatusEmail } from '../services/email.service';
import { AdminRequest, logAdminAction, notifyUser } from './admin-spec.helpers';

/** PATCH /api/admin/jobs/:id/approve — ACTIVE + email + socket + audit. (spec #9) */
export async function approveJob(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { notes } = req.body as { notes?: string };
    const job = await prisma.job.findUnique({
      where: { id },
      include: { employer: { select: { userId: true, companyName: true, user: { select: { email: true } } } } },
    });
    if (!job) return responses.notFound(res, 'Job not found');
    if (job.status === 'ACTIVE') return responses.badRequest(res, 'Job is already active');

    const updated = await prisma.job.update({
      where: { id }, data: { status: 'ACTIVE', publishedAt: job.publishedAt ?? new Date() },
    });

    await sendJobStatusEmail(job.employer.user.email, job.employer.companyName, job.title, true, notes).catch(() => {});
    await notifyUser(job.employer.userId, 'JOB_APPROVED', `Your job "${job.title}" is now live!`, `/employer/jobs/${job.id}`);
    emitToUser(job.employer.userId, 'job_approved', { jobId: job.id, title: job.title });
    await logAdminAction(req, 'approve_job', 'job', id, notes ?? null);

    return responses.ok(res, 'Job approved', { ...updated, status: 'ACTIVE' });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/admin/jobs/:id/reject — REJECTED + reason + email + audit. (spec #10) */
export async function rejectJob(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { reason } = req.body as { reason?: string };
    if (!reason?.trim()) return responses.badRequest(res, 'A rejection reason is required');
    const job = await prisma.job.findUnique({
      where: { id },
      include: { employer: { select: { userId: true, companyName: true, user: { select: { email: true } } } } },
    });
    if (!job) return responses.notFound(res, 'Job not found');

    const updated = await prisma.job.update({ where: { id }, data: { status: 'REJECTED' } });

    await sendJobStatusEmail(job.employer.user.email, job.employer.companyName, job.title, false, reason).catch(() => {});
    await notifyUser(job.employer.userId, 'JOB_REJECTED', `Your job "${job.title}" was not approved. Reason: ${reason}`, '/employer/jobs');
    emitToUser(job.employer.userId, 'job_rejected', { jobId: job.id, reason });
    await logAdminAction(req, 'reject_job', 'job', id, reason);

    return responses.ok(res, 'Job rejected', { ...updated, status: 'REJECTED' });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/admin/jobs/:id/feature — toggle + audit. (spec #11) */
export async function featureJob(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { featured } = req.body as { featured?: boolean };
    const job = await prisma.job.findUnique({ where: { id }, select: { id: true, featured: true } });
    if (!job) return responses.notFound(res, 'Job not found');
    const updated = await prisma.job.update({ where: { id }, data: { featured: featured ?? !job.featured } });
    await logAdminAction(req, updated.featured ? 'feature_job' : 'unfeature_job', 'job', id);
    return responses.ok(res, updated.featured ? 'Job featured' : 'Job unfeatured', updated);
  } catch (error) {
    next(error);
  }
}

/** Back to DRAFT with employer note (spec: "Request modifications"). */
export async function requestJobChanges(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { reason } = req.body as { reason?: string };
    if (!reason?.trim()) return responses.badRequest(res, 'Please describe the requested changes');
    const job = await prisma.job.findUnique({
      where: { id },
      include: { employer: { select: { userId: true, companyName: true } } },
    });
    if (!job) return responses.notFound(res, 'Job not found');
    const updated = await prisma.job.update({ where: { id }, data: { status: 'DRAFT' } });
    await notifyUser(job.employer.userId, 'JOB_REJECTED', `Changes requested on "${job.title}": ${reason}`, '/employer/jobs');
    emitToUser(job.employer.userId, 'job_changes_requested', { jobId: job.id, reason });
    await logAdminAction(req, 'request_job_changes', 'job', id, reason);
    return responses.ok(res, 'Changes requested', updated);
  } catch (error) {
    next(error);
  }
}
