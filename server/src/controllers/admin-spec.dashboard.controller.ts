import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { emitToUser } from '../lib/socket-server';
import { AdminRequest, logAdminAction, notifyUser, paginationMeta, parsePageLimit } from './admin-spec.helpers';

// ── Dashboard (spec endpoint #1) ──────────────────────────────────────────

/** GET /api/admin/dashboard — pending queues, recents, hire stats. */
export async function getAdminDashboard(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [
      totalUsers, totalJobs, totalApplications, totalHired,
      pendingJobs, pendingVerifications, openDisputes,
      newUsersToday, newJobsToday,
      recentJobs, recentApplications, recentDisputes, hiredApps,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.job.count(),
      prisma.application.count(),
      prisma.application.count({ where: { status: 'HIRED' } }),
      prisma.job.count({ where: { status: 'PENDING' } }),
      prisma.employerProfile.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.dispute.count({ where: { status: 'OPEN' } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.job.count({ where: { createdAt: { gte: today } } }),
      prisma.job.findMany({
        orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, title: true, status: true, createdAt: true, employer: { select: { companyName: true } } },
      }),
      prisma.application.findMany({
        orderBy: { createdAt: 'desc' }, take: 5,
        select: {
          id: true, status: true, createdAt: true,
          student: { select: { user: { select: { name: true } } } },
          job: { select: { title: true } },
        },
      }),
      prisma.dispute.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.application.findMany({ where: { status: 'HIRED' }, select: { createdAt: true, updatedAt: true }, take: 200 }),
    ]);

    const avgDays = hiredApps.length
      ? Math.round(hiredApps.reduce((s, a) => s + (a.updatedAt.getTime() - a.createdAt.getTime()), 0) / hiredApps.length / 86400000)
      : 0;

    return responses.ok(res, 'Admin dashboard fetched', {
      overview: {
        totalUsers, totalJobs, totalApplications, totalHired,
        pendingJobs, pendingVerifications, openDisputes,
        newUsersToday, newJobsToday,
      },
      recentJobs: recentJobs.map((j) => ({
        id: j.id, title: j.title, employer: j.employer.companyName, status: j.status, postedAt: j.createdAt,
      })),
      recentApplications: recentApplications.map((a) => ({
        id: a.id, student: a.student.user.name, job: a.job.title, status: a.status, appliedAt: a.createdAt,
      })),
      recentDisputes,
      stats: {
        avgTimeToHire: `${avgDays} days`,
        acceptanceRate: totalApplications ? `${((totalHired / totalApplications) * 100).toFixed(1)}%` : '0%',
      },
    });
  } catch (error) {
    next(error);
  }
}
