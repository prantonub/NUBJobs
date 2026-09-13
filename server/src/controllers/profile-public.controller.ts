import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
}

/**
 * GET /api/profile/:userId
 * Get public profile (student or employer)
 */
export async function getPublicProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return responses.notFound(res, 'User not found');
    }

    if (user.role === 'STUDENT') {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId },
        select: {
          photoUrl: true,
          cgpa: true,
          phone: true,
          location: true,
          bio: true,
          skills: true,
          linkedinUrl: true,
          githubUrl: true,
          portfolioUrl: true,
          department: true,
          nubId: true,
        },
      });

      return responses.ok(res, 'Student profile', {
        user,
        profile: studentProfile,
      });
    } else if (user.role === 'EMPLOYER') {
      const employerProfile = await prisma.employerProfile.findUnique({
        where: { userId },
        select: {
          companyName: true,
          logoUrl: true,
          about: true,
          website: true,
          linkedinUrl: true,
          isVerified: true,
        },
      });

      return responses.ok(res, 'Employer profile', {
        user,
        profile: employerProfile,
      });
    } else {
      return responses.ok(res, 'User profile', { user });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/profile
 * Update student profile
 */
export async function updateStudentProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      return responses.notFound(res, 'Student profile not found');
    }

    const {
      phone,
      location,
      bio,
      skills,
      linkedinUrl,
      githubUrl,
      portfolioUrl,
      nubId,
      cgpa,
      department,
    } = req.body;

    const updated = await prisma.studentProfile.update({
      where: { id: student.id },
      data: {
        ...(phone && { phone }),
        ...(location && { location }),
        ...(bio && { bio }),
        ...(skills && { skills }),
        ...(linkedinUrl && { linkedinUrl }),
        ...(githubUrl && { githubUrl }),
        ...(portfolioUrl && { portfolioUrl }),
        ...(nubId && { nubId }),
        ...(cgpa !== undefined && { cgpa: cgpa ? parseFloat(cgpa) : null }),
        ...(department && { department }),
      },
      include: { user: { select: { name: true, email: true } } },
    });

    return responses.ok(res, 'Profile updated', updated);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/profile/upload-resume
 * Upload resume (with Cloudinary integration)
 */
export async function uploadResume(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    if (!req.file) {
      return responses.badRequest(res, 'No file uploaded');
    }

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      return responses.notFound(res, 'Student profile not found');
    }

    // In production, upload to Cloudinary
    // For now, use base64
    const resumeUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const updated = await prisma.studentProfile.update({
      where: { id: student.id },
      data: { resumeUrl },
    });

    return responses.ok(res, 'Resume uploaded', {
      resumeUrl: updated.resumeUrl,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/profile/upload-photo
 * Upload profile photo (with Cloudinary integration)
 */
export async function uploadPhoto(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    if (!req.file) {
      return responses.badRequest(res, 'No file uploaded');
    }

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      return responses.notFound(res, 'Student profile not found');
    }

    // Validate file is image
    if (!req.file.mimetype.startsWith('image/')) {
      return responses.badRequest(res, 'File must be an image');
    }

    // In production, upload to Cloudinary
    // For now, use base64
    const photoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const updated = await prisma.studentProfile.update({
      where: { id: student.id },
      data: { photoUrl },
    });

    return responses.ok(res, 'Photo uploaded', {
      photoUrl: updated.photoUrl,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/profile/resume
 * Delete resume
 */
export async function deleteResume(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      return responses.notFound(res, 'Student profile not found');
    }

    await prisma.studentProfile.update({
      where: { id: student.id },
      data: { resumeUrl: null },
    });

    return responses.ok(res, 'Resume deleted');
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/profile/photo
 * Delete profile photo
 */
export async function deletePhoto(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;

    if (!userId) {
      return responses.unauthorized(res);
    }

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      return responses.notFound(res, 'Student profile not found');
    }

    await prisma.studentProfile.update({
      where: { id: student.id },
      data: { photoUrl: null },
    });

    return responses.ok(res, 'Photo deleted');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/profile/:userId/public
 * Get public profile view (limited info)
 */
export async function getPublicStudentProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = req.params;

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        photoUrl: true,
        bio: true,
        skills: true,
        linkedinUrl: true,
        githubUrl: true,
        portfolioUrl: true,
        cgpa: true,
        user: {
          select: { name: true, email: true },
        },
      },
    });

    if (!student) {
      return responses.notFound(res, 'Student not found');
    }

    return responses.ok(res, 'Public profile', student);
  } catch (error) {
    next(error);
  }
}