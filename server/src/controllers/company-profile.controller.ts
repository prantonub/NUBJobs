import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import { emitToUser } from '../lib/socket-server';
import { removeStoredFile } from '../lib/cloudinary';
import { storeCompanyLogo, storeVerificationDocument } from '../services/upload.service';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
}

/**
 * GET /api/company/profile
 * Get company profile
 */
export async function getCompanyProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: { email: true, createdAt: true },
        },
        _count: {
          select: { jobs: true },
        },
      },
    });

    if (!employer) {
      return responses.notFound(res, 'Company profile not found');
    }

    return responses.ok(res, 'Company profile fetched', {
      ...employer,
      jobsPosted: employer._count.jobs,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/company/profile
 * Update company profile
 */
export async function updateCompanyProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
    });

    if (!employer) {
      return responses.notFound(res, 'Company profile not found');
    }

    const {
      companyName,
      about,
      website,
      linkedinUrl,
      twitterUrl,
      facebookUrl,
      location,
      foundedYear,
      employees,
      industry,
      phone,
      email,
      logoUrl,
    } = req.body;

    // ── Validation (spec: PATCH /api/employer/company) ────────────────────────
    if (companyName !== undefined && (String(companyName).trim().length < 3 || String(companyName).trim().length > 100)) {
      return responses.badRequest(res, 'Company name must be 3-100 characters');
    }
    if (about !== undefined && about !== null && String(about).length > 2000) {
      return responses.badRequest(res, 'About must be at most 2000 characters');
    }
    for (const url of [website, linkedinUrl, twitterUrl, facebookUrl]) {
      if (url && !/^https?:\/\/\S+\.\S+/i.test(String(url))) {
        return responses.badRequest(res, `Invalid URL: ${url}`);
      }
    }
    if (phone && !/^\+?[0-9\s-]{6,20}$/.test(String(phone))) {
      return responses.badRequest(res, 'Invalid phone number format');
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return responses.badRequest(res, 'Invalid email address');
    }
    const currentYear = new Date().getFullYear();
    if (foundedYear !== undefined && foundedYear !== null && foundedYear !== '') {
      const year = parseInt(String(foundedYear), 10);
      if (Number.isNaN(year) || year < 1900 || year > currentYear) {
        return responses.badRequest(res, `Founded year must be between 1900 and ${currentYear}`);
      }
    }
    if (employees !== undefined && employees !== null && employees !== '') {
      const count = parseInt(String(employees), 10);
      if (Number.isNaN(count) || count <= 0) {
        return responses.badRequest(res, 'Employees must be a positive number');
      }
    }

    const toTrimmedOrNull = (value: unknown) => {
      const text = value === undefined ? undefined : value === null ? null : String(value).trim();
      return text === '' ? null : text;
    };

    const updated = await prisma.employerProfile.update({
      where: { id: employer.id },
      data: {
        ...(companyName !== undefined && { companyName: String(companyName).trim() }),
        ...(about !== undefined && { about: toTrimmedOrNull(about) }),
        ...(website !== undefined && { website: toTrimmedOrNull(website) }),
        ...(linkedinUrl !== undefined && { linkedinUrl: toTrimmedOrNull(linkedinUrl) }),
        ...(twitterUrl !== undefined && { twitterUrl: toTrimmedOrNull(twitterUrl) }),
        ...(facebookUrl !== undefined && { facebookUrl: toTrimmedOrNull(facebookUrl) }),
        ...(location !== undefined && { location: toTrimmedOrNull(location) }),
        ...(foundedYear !== undefined && {
          foundedYear: foundedYear === null || foundedYear === '' ? null : parseInt(String(foundedYear), 10),
        }),
        ...(employees !== undefined && {
          employees: employees === null || employees === '' ? null : parseInt(String(employees), 10),
        }),
        ...(industry !== undefined && { industry: toTrimmedOrNull(industry) }),
        ...(phone !== undefined && { phone: toTrimmedOrNull(phone) }),
        ...(email !== undefined && { email: toTrimmedOrNull(email) }),
        ...(logoUrl && { logoUrl }),
      },
      include: {
        _count: {
          select: { jobs: true },
        },
      },
    });

    return responses.ok(res, 'Company profile updated', updated);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/company/logo
 * Upload company logo
 */
export async function uploadLogo(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    if (!req.file) {
      return responses.badRequest(res, 'No file uploaded');
    }

    // Spec: max 5MB, images only
    if (!req.file.mimetype.startsWith('image/')) {
      return responses.badRequest(res, 'Logo must be an image file');
    }
    if (req.file.size > 5 * 1024 * 1024) {
      return responses.badRequest(res, 'Logo must be at most 5MB');
    }

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
    });

    if (!employer) {
      return responses.notFound(res, 'Company profile not found');
    }

    // Upload to Cloudinary, then swap the URL and clean up the previous file.
    const stored = await storeCompanyLogo(employer.id, req.file);
    const previousLogo = employer.logoUrl;

    const updated = await prisma.employerProfile.update({
      where: { id: employer.id },
      data: { logoUrl: stored.url },
    });

    if (previousLogo && previousLogo !== stored.url) {
      await removeStoredFile(previousLogo);
    }

    return responses.ok(res, 'Logo uploaded successfully', {
      ...updated,
      thumbnailUrl: stored.thumbnailUrl,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/company/logo
 * Delete company logo
 */
export async function deleteCompanyLogo(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
    });

    if (!employer) {
      return responses.notFound(res, 'Company profile not found');
    }

    // Detach the logo in Postgres, then delete the asset from Cloudinary.
    const updated = await prisma.employerProfile.update({
      where: { id: employer.id },
      data: { logoUrl: null },
    });

    await removeStoredFile(employer.logoUrl);

    return responses.ok(res, 'Logo deleted', updated);
  } catch (error) {
    next(error);
  }
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Six monthly buckets ending with the current month, keyed "YYYY-M". */
function buildMonthBuckets(): { key: string; label: string }[] {
  const buckets: { key: string; label: string }[] = [];
  const now = new Date();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: MONTH_LABELS[date.getMonth()],
    });
  }
  return buckets;
}

/**
 * GET /api/company/stats
 * Hiring metrics + analytics for the employer's dashboard.
 */
export async function getCompanyStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!employer) {
      return responses.notFound(res, 'Company profile not found');
    }

    const jobs = await prisma.job.findMany({
      where: { employerId: employer.id },
      select: {
        id: true,
        title: true,
        status: true,
        views: true,
        applicantCount: true,
        createdAt: true,
      },
    });

    const [applications, statusCounts] = await Promise.all([
      prisma.application.findMany({
        where: { job: { employerId: employer.id } },
        select: { createdAt: true },
      }),
      prisma.application.groupBy({
        by: ['status'],
        where: { job: { employerId: employer.id } },
        _count: { _all: true },
      }),
    ]);

    const countByStatus = Object.fromEntries(
      statusCounts.map((row) => [row.status, row._count._all])
    ) as Record<string, number>;

    const buckets = buildMonthBuckets();

    const jobsChart = buckets.map((bucket) => ({
      month: bucket.label,
      posted: jobs.filter(
        (job) => `${job.createdAt.getFullYear()}-${job.createdAt.getMonth()}` === bucket.key
      ).length,
    }));

    const applicationsChart = buckets.map((bucket) => ({
      month: bucket.label,
      count: applications.filter(
        (app) => `${app.createdAt.getFullYear()}-${app.createdAt.getMonth()}` === bucket.key
      ).length,
    }));

    const totalViews = jobs.reduce((sum, job) => sum + job.views, 0);
    const hired = countByStatus['HIRED'] ?? 0;
    const totalApplications = applications.length;
    const currentMonth = `${new Date().getFullYear()}-${new Date().getMonth()}`;

    const topJobs = [...jobs]
      .sort((a, b) => b.applicantCount - a.applicantCount)
      .slice(0, 5)
      .map((job) => ({ title: job.title, applicants: job.applicantCount }));

    return responses.ok(res, 'Company stats', {
      overview: {
        totalJobsPosted: jobs.length,
        activeJobs: jobs.filter((job) => job.status === 'ACTIVE').length,
        totalApplications,
        pendingApplications: countByStatus['APPLIED'] ?? 0,
        hired,
        viewsThisMonth: jobs
          .filter((job) => `${job.createdAt.getFullYear()}-${job.createdAt.getMonth()}` === currentMonth)
          .reduce((sum, job) => sum + job.views, 0),
      },
      jobsChart,
      applicationsChart,
      topJobs,
      applicationTrend: {
        acceptanceRate:
          totalApplications > 0 ? `${((hired / totalApplications) * 100).toFixed(1)}%` : '0%',
        viewsPerJob: jobs.length > 0 ? Math.round(totalViews / jobs.length) : 0,
        // Click-through proxy: applications relative to profile-wide views.
        clickThroughRate:
          totalViews > 0
            ? `${Math.min(100, Math.round((totalApplications / totalViews) * 100))}%`
            : '0%',
        // No hiredAt column exists yet, so time-to-hire is not computable.
        avgTimeToHire: null,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/companies
 * Public directory of verified companies.
 */
export async function listPublicCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const search = String(req.query.search ?? '').trim();
    const sort = String(req.query.sort ?? 'newest');
    const pageNum = Math.max(1, parseInt(String(req.query.page ?? '1')) || 1);
    const pageSize = Math.max(1, Math.min(50, parseInt(String(req.query.limit ?? '12')) || 12));

    const where = {
      isVerified: true,
      ...(search ? { companyName: { contains: search, mode: 'insensitive' as const } } : {}),
    };

    const [companies, total] = await Promise.all([
      prisma.employerProfile.findMany({
        where,
        select: {
          id: true,
          companyName: true,
          logoUrl: true,
          location: true,
          industry: true,
          createdAt: true,
          _count: { select: { jobs: { where: { status: 'ACTIVE' } } } },
        },
        orderBy: sort === 'mostJobs' ? { jobs: { _count: 'desc' } } : { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      prisma.employerProfile.count({ where }),
    ]);

    return res.json({
      data: companies.map((company) => ({
        id: company.id,
        name: company.companyName,
        logo: company.logoUrl,
        location: company.location,
        industry: company.industry,
        jobsCount: company._count.jobs,
        isVerified: true,
      })),
      pagination: {
        total,
        page: pageNum,
        limit: pageSize,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/companies/:id
 * Public company profile.
 */
export async function getPublicCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const company = await prisma.employerProfile.findUnique({
      where: { id: idStr },
      select: {
        id: true,
        companyName: true,
        about: true,
        logoUrl: true,
        location: true,
        website: true,
        foundedYear: true,
        employees: true,
        industry: true,
        linkedinUrl: true,
        twitterUrl: true,
        facebookUrl: true,
        isVerified: true,
        _count: { select: { jobs: { where: { status: 'ACTIVE' } } } },
      },
    });

    if (!company || !company.isVerified) {
      return responses.notFound(res, 'Company not found');
    }

    const hired = await prisma.application.count({
      where: { job: { employerId: company.id }, status: 'HIRED' },
    });

    return responses.ok(res, 'Company profile', {
      ...company,
      jobsCount: company._count.jobs,
      applicantsHired: hired,
      socialLinks: {
        linkedin: company.linkedinUrl,
        twitter: company.twitterUrl,
        facebook: company.facebookUrl,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * The verification document is persisted as a JSON string, so retrieve the
 * previously uploaded file URL (if any) for cleanup.
 */
function parseVerificationDocumentUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { documentUrl?: unknown };
    return typeof parsed.documentUrl === 'string' ? parsed.documentUrl : null;
  } catch {
    // Legacy rows stored plain text (not JSON) — nothing to delete.
    return null;
  }
}

/**
 * POST /api/company/verification-document
 * Upload verification document (for company verification)
 */
export async function uploadVerificationDocument(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    if (!req.file) {
      return responses.badRequest(res, 'No file uploaded');
    }

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
    });

    if (!employer) {
      return responses.notFound(res, 'Company profile not found');
    }

    // Upload the document to Cloudinary first, then persist its URL.
    const stored = await storeVerificationDocument(employer.id, req.file);
    const previousDocumentUrl = parseVerificationDocumentUrl(employer.verificationDocument);

    // Store verification document (for admin review)
    const documentData = {
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      documentUrl: stored.url,
      publicId: stored.publicId,
      uploadedAt: new Date(),
      status: 'PENDING', // Will be reviewed by admin
    };

    await prisma.employerProfile.update({
      where: { id: employer.id },
      data: {
        verificationDocument: JSON.stringify(documentData),
      },
    });

    // Replace the previous document on Cloudinary.
    if (previousDocumentUrl && previousDocumentUrl !== stored.url) {
      await removeStoredFile(previousDocumentUrl);
    }

    return responses.ok(res, 'Verification document uploaded. It will be reviewed by our team.', {
      status: 'PENDING',
      message: 'Your verification request has been submitted',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/company/request-verification
 * Request company verification
 */
export async function requestVerification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const { documentType, registrationNumber } = req.body;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
    });

    if (!employer) {
      return responses.notFound(res, 'Company profile not found');
    }

    if (employer.isVerified) {
      return responses.badRequest(res, 'Company is already verified');
    }

    // Create verification request
    const verificationRequest = {
      documentType,
      registrationNumber,
      requestedAt: new Date(),
      status: 'PENDING',
    };

    await prisma.employerProfile.update({
      where: { id: employer.id },
      data: {
        verificationRequest: JSON.stringify(verificationRequest),
      },
    });

    // Notify every admin so the request surfaces in the admin panel.
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: 'JOB_ALERT' as const,
          message: `New company verification request from ${employer.companyName}`,
          link: '/admin/companies',
        })),
      });
      for (const admin of admins) {
        emitToUser(admin.id, 'company_verification_request', {
          companyName: employer.companyName,
        });
      }
    }

    return responses.ok(res, 'Verification request submitted', {
      status: 'PENDING',
      message: 'Your company will be verified within 48 hours',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/company/verification-status
 * Get company verification status
 */
export async function getVerificationStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
    });

    if (!employer) {
      return responses.notFound(res, 'Company profile not found');
    }

    return responses.ok(res, 'Verification status', {
      isVerified: employer.isVerified,
      verificationBadge: employer.isVerified
        ? 'Verified'
        : 'Pending',
      updatedAt: employer.createdAt,
    });
  } catch (error) {
    next(error);
  }
}