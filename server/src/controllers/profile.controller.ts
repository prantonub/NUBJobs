import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { analyzeResume } from '../services/ai.service';

/**
 * GET /api/profile
 * Get current student profile
 */
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: { name: true, email: true },
        },
        _count: {
          select: {
            applications: true,
            savedJobs: true,
          },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Calculate completion percentage
    const fields = [
      profile.photoUrl,
      profile.phone,
      profile.location,
      profile.cgpa,
      profile.nubId,
      profile.resumeUrl,
      profile.skills?.length > 0,
      profile.experience,
      profile.projects,
    ];
    const completionPercentage = Math.round((fields.filter(Boolean).length / fields.length) * 100);

    res.json({
      data: {
        ...profile,
        completionPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/profile
 * Update student profile (auto-save)
 */
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const {
      nubId,
      department,
      cgpa,
      bio,
      phone,
      location,
      skills,
      linkedinUrl,
      githubUrl,
      portfolioUrl,
      education,
      experience,
      projects,
      certifications,
    } = req.body;

    // Get or create profile
    let profile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await prisma.studentProfile.create({
        data: { userId },
      });
    }

    // Update with provided fields
    const updated = await prisma.studentProfile.update({
      where: { userId },
      data: {
        ...(nubId && { nubId }),
        ...(department && { department }),
        ...(cgpa !== undefined && { cgpa: cgpa ? parseFloat(cgpa) : null }),
        ...(bio && { bio }),
        ...(phone && { phone }),
        ...(location && { location }),
        ...(skills && { skills }),
        ...(linkedinUrl && { linkedinUrl }),
        ...(githubUrl && { githubUrl }),
        ...(portfolioUrl && { portfolioUrl }),
        ...(education && { education }),
        ...(experience && { experience }),
        ...(projects && { projects }),
        ...(certifications && { certifications }),
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
        _count: {
          select: {
            applications: true,
            savedJobs: true,
          },
        },
      },
    });

    res.json({ data: updated, message: 'Profile updated' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/profile/photo
 * Upload profile photo
 */
export const uploadProfilePhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // In production, upload to Cloudinary
    // For now, we'll use base64 or a placeholder
    const photoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const updated = await prisma.studentProfile.update({
      where: { userId },
      data: { photoUrl },
    });

    res.json({ data: updated, message: 'Photo uploaded' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/profile/resume
 * Upload resume
 */
export const uploadResume = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // In production, upload to Cloudinary
    const resumeUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const updated = await prisma.studentProfile.update({
      where: { userId },
      data: { resumeUrl },
    });

    res.json({ data: updated, message: 'Resume uploaded' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/profile/resume/analyze
 * Analyze resume with AI
 */
export const analyzeProfileResume = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile || !profile.resumeUrl) {
      return res.status(400).json({ error: 'No resume found' });
    }

    // Extract text from resume (simplified - in production use a PDF parser)
    const resumeText = profile.resumeUrl; // Placeholder

    const analysis = await analyzeResume(resumeText);

    // Store analysis result (optional - extend schema if needed)
    res.json({
      data: {
        strengthScore: analysis.strengthScore,
        skills: analysis.skills,
        improvements: analysis.improvements,
        suggestedJobTitles: analysis.suggestedJobTitles,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/profile/eligible-jobs
 * Get count of jobs eligible for this student based on CGPA
 */
export const getEligibleJobsCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const count = await prisma.job.count({
      where: {
        status: 'ACTIVE',
        minCgpa: { lte: profile.cgpa || 4.0 },
      },
    });

    res.json({ data: { count } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/profile/completion
 * Get profile completion status
 */
export const getProfileCompletion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const completionData = {
      photo: !!profile.photoUrl,
      personal: !!(profile.phone && profile.location && profile.bio),
      education: !!(profile.nubId && profile.cgpa),
      skills: profile.skills && profile.skills.length > 0,
      experience: !!profile.experience,
      projects: !!profile.projects,
      certifications: !!profile.certifications,
      resume: !!profile.resumeUrl,
    };

    const completedFields = Object.values(completionData).filter(Boolean).length;
    const percentage = Math.round((completedFields / Object.keys(completionData).length) * 100);

    res.json({
      data: {
        percentage,
        sections: completionData,
      },
    });
  } catch (error) {
    next(error);
  }
};