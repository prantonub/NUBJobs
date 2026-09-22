import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { removeStoredFile } from '../lib/cloudinary';
import { storeProfilePhoto, storeResume } from '../services/upload.service';
import { analyzeResume } from '../services/ai.service';

/** String columns of `StudentProfile` that the profile form may send. */
const PROFILE_STRING_FIELDS = [
  'nubId',
  'department',
  'bio',
  'phone',
  'location',
  'linkedinUrl',
  'githubUrl',
  'portfolioUrl',
] as const;

/** Those of the fields above that must look like a URL when not empty. */
const PROFILE_URL_FIELDS = ['linkedinUrl', 'githubUrl', 'portfolioUrl'] as const;

const URL_PATTERN = /^https?:\/\/\S+\.\S+/i;

/**
 * `undefined` → field was not sent, leave the column untouched.
 * `null` / `''` / whitespace → clear the column (`null`).
 * Anything else → trimmed string.
 */
function readOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

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

    const profile = await prisma.studentProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
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
      profile.linkedinUrl,
      profile.githubUrl,
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

    const body = (req.body ?? {}) as Record<string, unknown>;

    // ── Validation ───────────────────────────────────────────────────────────
    for (const field of PROFILE_URL_FIELDS) {
      const value = readOptionalString(body[field]);
      if (typeof value === 'string' && !URL_PATTERN.test(value)) {
        return res.status(400).json({ error: `${field} must be a valid URL (e.g. https://example.com)` });
      }
    }

    let cgpaValue: number | null | undefined;
    if (body.cgpa !== undefined) {
      if (body.cgpa === null || body.cgpa === '') {
        cgpaValue = null;
      } else {
        const parsed = typeof body.cgpa === 'number' ? body.cgpa : Number(body.cgpa);
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > 4) {
          return res.status(400).json({ error: 'CGPA must be a number between 0 and 4' });
        }
        cgpaValue = parsed;
      }
    }

    if (body.skills !== undefined && !Array.isArray(body.skills)) {
      return res.status(400).json({ error: 'skills must be an array of strings' });
    }

    // ── Build the update payload ─────────────────────────────────────────────
    // Only fields present in the request are written, so a partial auto-save
    // never wipes values the form did not send.
    const data: Prisma.StudentProfileUpdateInput = {};

    for (const field of PROFILE_STRING_FIELDS) {
      const value = readOptionalString(body[field]);
      if (value !== undefined) data[field] = value;
    }

    if (cgpaValue !== undefined) data.cgpa = cgpaValue;

    if (Array.isArray(body.skills)) {
      data.skills = (body.skills as unknown[])
        .filter((skill): skill is string => typeof skill === 'string')
        .map((skill) => skill.trim())
        .filter(Boolean);
    }

    // ── Make sure the row exists, then update ────────────────────────────────
    // (a first-time save on a fresh account must not fail with P2025)
    await prisma.studentProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    const updated = await prisma.studentProfile.update({
      where: { userId },
      data,
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
    // `nubId` is unique: report a duplicate as 409 instead of a 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'That NUB ID is already linked to another account' });
    }
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

    // Remember the current asset so it can be removed after the swap.
    const previous = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { photoUrl: true },
    });

    // Upload to Cloudinary first: if it fails, the previous photo stays intact.
    const stored = await storeProfilePhoto(userId, req.file);

    const updated = await prisma.studentProfile.upsert({
      where: { userId },
      create: { userId, photoUrl: stored.url },
      update: { photoUrl: stored.url },
    });

    // Only remove the previous asset once the DB points at the new one.
    if (previous?.photoUrl && previous.photoUrl !== stored.url) {
      await removeStoredFile(previous.photoUrl);
    }

    res.json({
      data: updated,
      thumbnailUrl: stored.thumbnailUrl,
      message: 'Photo uploaded',
    });
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

    // Remember the current asset so it can be removed after the swap.
    const previous = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { resumeUrl: true },
    });

    // Upload to Cloudinary first: if it fails, the previous resume stays intact.
    const stored = await storeResume(userId, req.file);

    const updated = await prisma.studentProfile.upsert({
      where: { userId },
      create: { userId, resumeUrl: stored.url },
      update: { resumeUrl: stored.url },
    });

    // Delete the outdated resume file from Cloudinary.
    if (previous?.resumeUrl && previous.resumeUrl !== stored.url) {
      await removeStoredFile(previous.resumeUrl);
    }

    res.json({
      data: updated,
      resumeUrl: stored.url,
      fileName: req.file.originalname,
      message: 'Resume uploaded',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/profile/photo
 * Delete the profile photo from Postgres and Cloudinary
 */
export const deleteProfilePhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { photoUrl: true },
    });

    const updated = await prisma.studentProfile.upsert({
      where: { userId },
      create: { userId },
      update: { photoUrl: null },
    });

    await removeStoredFile(profile?.photoUrl);

    res.json({ data: updated, message: 'Photo deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/profile/resume
 * Delete the resume from Postgres and Cloudinary
 */
export const deleteProfileResume = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { resumeUrl: true },
    });

    const updated = await prisma.studentProfile.upsert({
      where: { userId },
      create: { userId },
      update: { resumeUrl: null },
    });

    await removeStoredFile(profile?.resumeUrl);

    res.json({ data: updated, message: 'Resume deleted' });
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
      experience: !!profile.linkedinUrl,
      projects: !!profile.portfolioUrl,
      certifications: !!profile.githubUrl,
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