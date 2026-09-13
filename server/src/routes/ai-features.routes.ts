import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import {
  analyzeResumeFile,
  generateCoverLetterHandler,
  getMockInterviewQuestions,
  evaluateAnswerHandler,
  improveJobDescriptionHandler,
} from '../controllers/ai-features.controller';
import { authenticate, requireRole, validate } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Validation schemas
const generateCoverLetterSchema = z.object({
  jobId: z.string().uuid(),
});

const evaluateAnswerSchema = z.object({
  question: z.string().min(10),
  answer: z.string().min(10),
  jobContext: z.string().min(10),
});

// All AI routes require authentication
router.use(authenticate);

// Resume analysis (student only)
router.post(
  '/analyze-resume',
  upload.single('resume'),
  analyzeResumeFile
);

// Cover letter generation (student only)
router.post(
  '/generate-cover-letter',
  validate(generateCoverLetterSchema),
  generateCoverLetterHandler
);

// Mock interview (student only)
router.get('/mock-interview/:jobId', getMockInterviewQuestions);

// Answer evaluation (student only)
router.post(
  '/evaluate-answer',
  validate(evaluateAnswerSchema),
  evaluateAnswerHandler
);

// Job description improvement (employer only)
router.put(
  '/improve-job-description/:jobId',
  requireRole('EMPLOYER'),
  improveJobDescriptionHandler
);

export default router;