import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';

/**
 * Analyze resume PDF
 */
export const useAnalyzeResume = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('resume', file);
      const { data } = await api.post('/ai/analyze-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data;
    },
  });
};

/**
 * Generate cover letter
 */
export const useGenerateCoverLetter = () => {
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data } = await api.post('/ai/generate-cover-letter', {
        jobId,
      });
      return data.data;
    },
  });
};

/**
 * Get mock interview questions
 */
export const useMockInterviewQuestions = (jobId: string | null) => {
  return useQuery({
    queryKey: ['mockInterview', jobId],
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID required');
      const { data } = await api.get(`/ai/mock-interview/${jobId}`);
      return data.data;
    },
    enabled: !!jobId,
  });
};

/**
 * Evaluate mock interview answer
 */
export const useEvaluateAnswer = () => {
  return useMutation({
    mutationFn: async (payload: {
      question: string;
      answer: string;
      jobContext: string;
    }) => {
      const { data } = await api.post('/ai/evaluate-answer', payload);
      return data.data;
    },
  });
};

/**
 * Improve job description
 */
export const useImproveJobDescription = (jobId: string) => {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.put(`/ai/improve-job-description/${jobId}`);
      return data.data;
    },
  });
};