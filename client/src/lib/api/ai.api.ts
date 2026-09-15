import api from '@/lib/axios';

export const aiApi = {
  analyzeResume: (file: File) => {
    const formData = new FormData();
    formData.append('resume', file);
    return api.post('/ai/analyze-resume', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  generateCoverLetter: (jobId: string) => api.post('/ai/generate-cover-letter', { jobId }),
  mockInterviewQuestions: (jobId: string) => api.get(`/ai/mock-interview/${jobId}`),
  evaluateAnswer: (payload: { question: string; answer: string; jobContext: string }) =>
    api.post('/ai/evaluate-answer', payload),
  improveJobDescription: (jobId: string) => api.put(`/ai/improve-job-description/${jobId}`),
};
