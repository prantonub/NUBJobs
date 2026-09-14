import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { responses } from '../utils/response.utils';
import {
  analyzeResume,
  generateCoverLetter,
  generateMockInterviewQuestions,
  evaluateMockAnswer,
  improveJobDescription,
} from '../services/ai-service-advanced';
import { PDFParse } from 'pdf-parse';

export interface AuthRequest extends Request {
  userId?: string | string[];
  email?: string;
  role?: string;
}

/**
 * POST /api/ai/analyze-resume
 * Analyze resume using Claude
 */
export async function analyzeResumeFile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    if (!req.file) {
      return responses.badRequest(res, 'No file uploaded');
    }

    // Extract PDF text
    let resumeText = '';
    try {
      const parser = new PDFParse({ data: req.file.buffer });
      const data = await parser.getText();
      resumeText = data.text;
    } catch {
      return responses.badRequest(res, 'Failed to parse PDF');
    }

    // Get student profile
    const student = await prisma.studentProfile.findUnique({
      where: { userId: userIdStr },
      select: { skills: true },
    });

    if (!student) {
      return responses.notFound(res, 'Student not found');
    }

    // Analyze using Claude
    const analysis = await analyzeResume(resumeText, student.skills);

    // Store analysis in database
    await prisma.studentProfile.update({
      where: { userId: userIdStr },
      data: {
        skills: Array.from(new Set([...(student.skills || []), ...analysis.extractedSkills])),
      },
    });

    return responses.ok(res, 'Resume analyzed', analysis);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/ai/generate-cover-letter
 * Generate cover letter using Claude
 */
export async function generateCoverLetterHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;
    const { jobId } = req.body;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    // Get student profile
    const student = await prisma.studentProfile.findUnique({
      where: { userId: userIdStr },
      include: { user: { select: { name: true } } },
    });

    if (!student) {
      return responses.notFound(res, 'Student not found');
    }

    // Get job details
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { employer: { select: { companyName: true } } },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    // Generate cover letter
    const result = await generateCoverLetter(
      student.user.name,
      student.skills || [],
      student.cgpa || 0,
      job.title,
      job.description,
      job.employer.companyName
    );

    return responses.ok(res, 'Cover letter generated', result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/ai/mock-interview/:jobId
 * Generate mock interview questions
 */
export async function getMockInterviewQuestions(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { jobId } = req.params;
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;
    const jobIdStr = Array.isArray(jobId) ? jobId[0] : jobId;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    // Get job details
    const job = await prisma.job.findUnique({
      where: { id: jobIdStr },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    // Get student skills
    const student = await prisma.studentProfile.findUnique({
      where: { userId: userIdStr },
      select: { skills: true },
    });

    // Generate questions
    const result = await generateMockInterviewQuestions(
      job.title,
      job.description,
      student?.skills || []
    );

    return responses.ok(res, 'Interview questions generated', result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/ai/evaluate-answer
 * Evaluate mock interview answer
 */
export async function evaluateAnswerHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;
    const { question, answer, jobContext } = req.body;

    if (!userIdStr) {
      return responses.unauthorized(res);
    }

    if (!question || !answer || !jobContext) {
      return responses.badRequest(res, 'Missing required fields');
    }

    // Evaluate using Claude
    const result = await evaluateMockAnswer(question, answer, jobContext);

    return responses.ok(res, 'Answer evaluated', result);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/ai/improve-job-description/:jobId
 * Improve job description using Claude
 */
export async function improveJobDescriptionHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { jobId } = req.params;
    const userId = req.userId;
    const userIdStr = Array.isArray(userId) ? userId[0] : userId;
    const jobIdStr = Array.isArray(jobId) ? jobId[0] : jobId;

    if (!userIdStr || req.role !== 'EMPLOYER') {
      return responses.forbidden(res);
    }

    const job = await prisma.job.findUnique({
      where: { id: jobIdStr },
      include: { employer: true },
    });

    if (!job) {
      return responses.notFound(res, 'Job not found');
    }

    if (job.employer.userId !== userIdStr) {
      return responses.forbidden(res);
    }

    // Improve description
    const result = await improveJobDescription(job.description);

    return responses.ok(res, 'Description improved', result);
  } catch (error) {
    next(error);
  }
}