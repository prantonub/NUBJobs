import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { AdminRequest, logAdminAction, notifyUser, paginationMeta, parsePageLimit } from './admin-spec.helpers';

/** GET /api/admin/disputes — status/type filters + pagination. (spec #19) */
export async function listDisputes(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = parsePageLimit(req.query);
    const q = req.query as Record<string, string | undefined>;
    const where: any = {};
    if (q.status) where.status = String(q.status).toUpperCase();
    if (q.type) where.type = String(q.type).toUpperCase();
    const [total, disputes] = await Promise.all([
      prisma.dispute.count({ where }),
      prisma.dispute.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { user: { select: { name: true, email: true } } } },
          employer: { select: { companyName: true, user: { select: { email: true } } } },
        },
      }),
    ]);
    return responses.ok(res, 'Disputes fetched', {
      disputes: disputes.map((d) => ({
        id: d.id, type: d.type,
        student: d.student?.user.name ?? null, employer: d.employer?.companyName ?? null,
        status: d.status, createdAt: d.createdAt,
      })),
      ...paginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/disputes/:id — parties + chat history + timeline. (spec #20) */
export async function getDisputeDetail(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        student: { include: { user: { select: { id: true, name: true, email: true } } } },
        employer: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    if (!dispute) return responses.notFound(res, 'Dispute not found');
    let chatHistory: unknown[] = [];
    if (dispute.applicationId) {
      chatHistory = await prisma.message.findMany({
        where: { applicationId: dispute.applicationId },
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { name: true, role: true } } },
      });
    }
    return responses.ok(res, 'Dispute detail fetched', {
      ...dispute,
      timeline: [
        { at: dispute.createdAt, event: 'Dispute reported' },
        ...(dispute.resolvedAt ? [{ at: dispute.resolvedAt, event: `Resolved by ${dispute.resolvedBy ?? 'admin'}` }] : []),
      ],
      chatHistory,
    });
  } catch (error) {
    next(error);
  }
}
