import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';

export interface AuthRequest extends Request {
  userId?: string | string[];
  email?: string;
  role?: string;
}

/**
 * GET /api/profile/public/:userId
 * Get public profile (role-aware)
 */
export async function getPublicProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId: paramUserId } = req.params;
    
    // Convert to string if array
    const userIdStr = Array.isArray(paramUserId) ? paramUserId[0] : paramUserId;

    const user = await prisma.user.findUnique({
      where: { id: userIdStr },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentProfile: {
          select: {
            cgpa: true,
            skills: true,
            bio: true,
            photoUrl: true,
            linkedinUrl: true,
            githubUrl: true,
            portfolioUrl: true,
          },
        },
        employerProfile: {
          select: {
            companyName: true,
            about: true,
            logoUrl: true,
            website: true,
          },
        },
      },
    });

    if (!user) {
      return responses.notFound(res, 'User not found');
    }

    return responses.ok(res, 'Public profile retrieved', user);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/profile/student
 * Update student profile
 */
export async function updateStudentProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    
    // Convert to string if array
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    const {
      phone,
      location,
      bio,
      department,
      cgpa,
      skills,
      linkedinUrl,
      githubUrl,
      portfolioUrl,
    } = req.body;

    const updated = await prisma.studentProfile.update({
      where: { userId: userIdStr },
      data: {
        phone: phone || undefined,
        location: location || undefined,
        bio: bio || undefined,
        department: department || undefined,
        cgpa: cgpa ? parseFloat(cgpa) : undefined,
        skills: skills || undefined,
        linkedinUrl: linkedinUrl || undefined,
        githubUrl: githubUrl || undefined,
        portfolioUrl: portfolioUrl || undefined,
      },
    });

    return responses.ok(res, 'Student profile updated', updated);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/profile/employer
 * Update employer profile
 */
export async function updateEmployerProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    
    // Convert to string if array
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    const { about, website, linkedinUrl } = req.body;

    const updated = await prisma.employerProfile.update({
      where: { userId: userIdStr },
      data: {
        about: about || undefined,
        website: website || undefined,
        linkedinUrl: linkedinUrl || undefined,
      },
    });

    return responses.ok(res, 'Employer profile updated', updated);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/profile/student/resume
 * Upload resume (multipart/form-data)
 */
export async function uploadResume(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    
    // Convert to string if array
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    if (!req.file) {
      return responses.badRequest(res, 'No file uploaded');
    }

    // In production, upload to cloud storage (S3, etc.)
    // For now, save as base64 or URL
    const resumeUrl = `/uploads/resumes/${userIdStr}/${req.file.originalname}`;

    const updated = await prisma.studentProfile.update({
      where: { userId: userIdStr },
      data: { resumeUrl },
    });

    return responses.ok(res, 'Resume uploaded', { resumeUrl });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/profile/student/photo
 * Upload profile photo (multipart/form-data)
 */
export async function uploadPhoto(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    
    // Convert to string if array
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    if (!req.file) {
      return responses.badRequest(res, 'No file uploaded');
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
      return responses.badRequest(res, 'File must be an image');
    }

    // In production, upload to cloud storage (S3, etc.)
    const photoUrl = `/uploads/photos/${userIdStr}/${req.file.originalname}`;

    const updated = await prisma.studentProfile.update({
      where: { userId: userIdStr },
      data: { photoUrl },
    });

    return responses.ok(res, 'Photo uploaded', { photoUrl });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/profile/student/resume
 * Delete resume
 */
export async function deleteResume(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    
    // Convert to string if array
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    const updated = await prisma.studentProfile.update({
      where: { userId: userIdStr },
      data: { resumeUrl: null },
    });

    return responses.ok(res, 'Resume deleted', updated);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/profile/student/photo
 * Delete profile photo
 */
export async function deletePhoto(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    
    // Convert to string if array
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    const updated = await prisma.studentProfile.update({
      where: { userId: userIdStr },
      data: { photoUrl: null },
    });

    return responses.ok(res, 'Photo deleted', updated);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/profile/public/student/:studentId
 * Get public student profile
 */
export async function getPublicStudentProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { studentId } = req.params;
    
    // Convert to string if array
    const studentIdStr = Array.isArray(studentId) ? studentId[0] : studentId;

    const profile = await prisma.studentProfile.findUnique({
      where: { id: studentIdStr },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!profile) {
      return responses.notFound(res, 'Student not found');
    }

    return responses.ok(res, 'Public student profile', profile);
  } catch (error) {
    next(error);
  }
}