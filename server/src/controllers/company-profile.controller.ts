import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';

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
      logoUrl,
    } = req.body;

    const updated = await prisma.employerProfile.update({
      where: { id: employer.id },
      data: {
        ...(companyName && { companyName }),
        ...(about && { about }),
        ...(website && { website }),
        ...(linkedinUrl && { linkedinUrl }),
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

    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
    });

    if (!employer) {
      return responses.notFound(res, 'Company profile not found');
    }

    // In production, upload to Cloudinary
    const logoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const updated = await prisma.employerProfile.update({
      where: { id: employer.id },
      data: { logoUrl },
    });

    return responses.ok(res, 'Logo uploaded successfully', updated);
  } catch (error) {
    next(error);
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

    // Store verification document (for admin review)
    const documentData = {
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      uploadedAt: new Date(),
      status: 'PENDING', // Will be reviewed by admin
    };

    // Store in database (you might want to extend schema for this)
    // For now, we'll create a simple record
    await prisma.employerProfile.update({
      where: { id: employer.id },
      data: {
        verificationDocument: JSON.stringify(documentData),
      },
    });

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