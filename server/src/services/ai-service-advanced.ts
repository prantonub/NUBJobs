import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Analyze resume using Claude Haiku
 * Extracts skills, calculates profile strength, suggests improvements
 */
export async function analyzeResume(resumeText: string, studentSkills?: string[]) {
  try {
    const prompt = `Analyze this resume and provide:
1. Profile strength score (0-100)
2. Extracted technical and soft skills
3. Top 3 areas for improvement
4. 3 suggested job titles based on skills

Resume:
${resumeText}

Current skills on profile: ${studentSkills?.join(', ') || 'None'}

Respond in JSON format:
{
  "profileStrength": <number>,
  "extractedSkills": [<string>],
  "improvements": [<string>],
  "suggestedJobTitles": [<string>],
  "summary": "<string>"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON response');
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      profileStrength: result.profileStrength || 0,
      extractedSkills: result.extractedSkills || [],
      improvements: result.improvements || [],
      suggestedJobTitles: result.suggestedJobTitles || [],
      summary: result.summary || '',
    };
  } catch (error) {
    console.error('Error analyzing resume:', error);
    throw error;
  }
}

/**
 * Generate personalized cover letter using Claude
 */
export async function generateCoverLetter(
  studentName: string,
  studentSkills: string[],
  studentCGPA: number,
  jobTitle: string,
  jobDescription: string,
  companyName: string
) {
  try {
    const prompt = `Generate a professional cover letter for a job application.

Student Details:
- Name: ${studentName}
- Skills: ${studentSkills.join(', ')}
- CGPA: ${studentCGPA}

Job Details:
- Company: ${companyName}
- Position: ${jobTitle}
- Description: ${jobDescription}

Generate a well-structured, professional cover letter (3-4 paragraphs) that:
1. Opens with enthusiasm for the role
2. Highlights relevant skills and experience
3. Shows understanding of the company
4. Closes with call to action

Keep tone professional but personable. Be specific to the job.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return {
      coverLetter: content.text,
    };
  } catch (error) {
    console.error('Error generating cover letter:', error);
    throw error;
  }
}

/**
 * Generate mock interview questions using Claude
 */
export async function generateMockInterviewQuestions(
  jobTitle: string,
  jobDescription: string,
  skills: string[]
) {
  try {
    const prompt = `Generate 7 interview questions for a ${jobTitle} position.

Job Description: ${jobDescription}
Key Skills: ${skills.join(', ')}

Create a mix of:
- 2 behavioral questions (about past experiences)
- 3 technical questions (about skills/knowledge)
- 2 situational questions (how you'd handle scenarios)

Respond in JSON format:
{
  "questions": [
    {
      "id": <number>,
      "type": "behavioral|technical|situational",
      "question": "<string>",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON response');
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      questions: result.questions || [],
    };
  } catch (error) {
    console.error('Error generating interview questions:', error);
    throw error;
  }
}

/**
 * Evaluate mock interview answer using Claude
 */
export async function evaluateMockAnswer(
  question: string,
  studentAnswer: string,
  jobContext: string
) {
  try {
    const prompt = `Evaluate this interview answer and provide feedback.

Question: ${question}

Job Context: ${jobContext}

Student's Answer:
${studentAnswer}

Evaluate and respond in JSON format:
{
  "score": <number 0-10>,
  "strengths": [<string>],
  "areasForImprovement": [<string>],
  "feedback": "<string>",
  "suggestedAnswer": "<string>"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON response');
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      score: result.score || 0,
      strengths: result.strengths || [],
      areasForImprovement: result.areasForImprovement || [],
      feedback: result.feedback || '',
      suggestedAnswer: result.suggestedAnswer || '',
    };
  } catch (error) {
    console.error('Error evaluating answer:', error);
    throw error;
  }
}

/**
 * Improve job description using Claude
 */
export async function improveJobDescription(description: string) {
  try {
    const prompt = `Improve this job description to make it more engaging and clear for candidates.

Original:
${description}

Provide an improved version that:
1. Is more engaging and compelling
2. Clearly outlines responsibilities
3. Highlights growth opportunities
4. Uses action-oriented language
5. Remains professional and concise

Return ONLY the improved job description without any additional commentary.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return {
      improvedDescription: content.text,
    };
  } catch (error) {
    console.error('Error improving description:', error);
    throw error;
  }
}

/**
 * Calculate match score between student and job
 */
export async function calculateMatchScore(jobId: string, studentId: string) {
  try {
    // This would typically query the database for job and student details
    // For now, returning a placeholder that should be implemented with DB calls
    // In real implementation: get job requirements and student skills from DB
    // Then compare and score

    // Placeholder score between 0-100
    return Math.floor(Math.random() * 100);
  } catch (error) {
    console.error('Error calculating match score:', error);
    return 0;
  }
}