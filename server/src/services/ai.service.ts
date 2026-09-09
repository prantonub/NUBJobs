import prisma from '../lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Calculate match score between a student and a job (0-100)
 */
export async function calculateMatchScore(
  jobId: string,
  studentId: string
): Promise<number> {
  try {
    const [job, student] = await Promise.all([
      prisma.job.findUnique({
        where: { id: jobId },
        include: { employer: true },
      }),
      prisma.studentProfile.findUnique({
        where: { id: studentId },
      }),
    ]);

    if (!job || !student) {
      return 0;
    }

    // Build prompt for Claude
    const prompt = `
You are an AI recruiter. Evaluate how well a student matches a job posting based on the following criteria and provide a match score from 0-100.

JOB:
Title: ${job.title}
Description: ${job.description}
Required Skills: ${job.skills?.join(', ') || 'Not specified'}
Min CGPA: ${job.minCgpa || 'None'}
Job Type: ${job.type}
Location: ${job.location || 'Remote'}

STUDENT:
Skills: ${student.skills?.join(', ') || 'Not provided'}
CGPA: ${student.cgpa || 'Not provided'}
Experience: ${student.experience ? JSON.stringify(student.experience) : 'None'}
Projects: ${student.projects ? JSON.stringify(student.projects) : 'None'}

Respond with ONLY a JSON object in this format:
{
  "score": <number 0-100>,
  "reasoning": "<brief explanation>"
}
`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const parsed = JSON.parse(content.text);
      return Math.min(100, Math.max(0, parseInt(parsed.score) || 0));
    }

    return 50; // Default fallback
  } catch (error) {
    console.error('Error calculating match score:', error);
    return 50; // Neutral fallback
  }
}

/**
 * Analyze resume and extract insights
 */
export async function analyzeResume(resumeText: string): Promise<{
  strengthScore: number;
  skills: string[];
  improvements: string[];
  suggestedJobTitles: string[];
}> {
  try {
    const prompt = `
You are an expert career coach. Analyze the following resume and provide structured feedback.

RESUME:
${resumeText}

Respond with ONLY a JSON object in this format:
{
  "strengthScore": <number 0-100>,
  "skills": [<list of extracted skills>],
  "improvements": [<list of improvement suggestions>],
  "suggestedJobTitles": [<list of 3-5 job titles this person should target>]
}
`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const parsed = JSON.parse(content.text);
      return {
        strengthScore: Math.min(100, Math.max(0, parseInt(parsed.strengthScore) || 0)),
        skills: parsed.skills || [],
        improvements: parsed.improvements || [],
        suggestedJobTitles: parsed.suggestedJobTitles || [],
      };
    }

    return {
      strengthScore: 0,
      skills: [],
      improvements: [],
      suggestedJobTitles: [],
    };
  } catch (error) {
    console.error('Error analyzing resume:', error);
    return {
      strengthScore: 0,
      skills: [],
      improvements: [],
      suggestedJobTitles: [],
    };
  }
}

/**
 * Generate a cover letter for a student applying to a job
 */
export async function generateCoverLetter(
  jobId: string,
  studentId: string
): Promise<string> {
  try {
    const [job, student] = await Promise.all([
      prisma.job.findUnique({
        where: { id: jobId },
        include: { employer: true },
      }),
      prisma.studentProfile.findUnique({
        where: { id: studentId },
        include: {
          user: {
            select: { name: true },
          },
        },
      }),
    ]);

    if (!job || !student) {
      return '';
    }

    const prompt = `
Write a professional cover letter for a student applying to a job. Make it personalized and compelling.

STUDENT:
Name: ${student.user?.name}
Skills: ${student.skills?.join(', ')}
CGPA: ${student.cgpa}
Experience: ${student.experience ? JSON.stringify(student.experience) : 'Limited'}

JOB:
Title: ${job.title}
Company: ${job.employer?.companyName}
Description: ${job.description}
Required Skills: ${job.skills?.join(', ')}

Write a 3-4 paragraph cover letter. Start with "Dear Hiring Manager," and end with "Best regards, [Student Name]"
`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    return '';
  } catch (error) {
    console.error('Error generating cover letter:', error);
    return '';
  }
}

/**
 * Get AI insights for dashboard
 */
export async function getDashboardInsights(studentId: string): Promise<{
  recommendedJobs: string[];
  careerAdvice: string;
}> {
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return {
        recommendedJobs: [],
        careerAdvice: '',
      };
    }

    const prompt = `
Based on a student's profile, provide career guidance.

STUDENT PROFILE:
Skills: ${student.skills?.join(', ')}
CGPA: ${student.cgpa}
Experience: ${student.experience ? JSON.stringify(student.experience) : 'Limited'}
Projects: ${student.projects ? JSON.stringify(student.projects) : 'None'}

Respond with ONLY a JSON object:
{
  "recommendedJobs": [<3-4 job titles>],
  "careerAdvice": "<one paragraph of guidance>"
}
`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const parsed = JSON.parse(content.text);
      return {
        recommendedJobs: parsed.recommendedJobs || [],
        careerAdvice: parsed.careerAdvice || '',
      };
    }

    return {
      recommendedJobs: [],
      careerAdvice: '',
    };
  } catch (error) {
    console.error('Error getting dashboard insights:', error);
    return {
      recommendedJobs: [],
      careerAdvice: '',
    };
  }
}