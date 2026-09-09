'use client';

import { FC, useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Lightbulb, Target, Zap } from 'lucide-react';

const ResumeAnalysisPage: FC = () => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockAnalysis = {
      strengthScore: 78,
      skills: ['React', 'Node.js', 'TypeScript', 'Python', 'PostgreSQL', 'AWS'],
      improvements: [
        'Add more leadership experience to stand out',
        'Include quantifiable achievements in projects',
        'Highlight technical certifications prominently',
      ],
      suggestedJobTitles: [
        'Full-Stack Developer',
        'Frontend Engineer',
        'Software Engineer',
      ],
    };
    setAnalysis(mockAnalysis);
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/profile">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Profile
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold">Resume Analysis</h1>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        </div>

        {/* Strength Score */}
        <Card className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <h2 className="text-lg font-semibold mb-4">Overall Strength Score</h2>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white">
              <span className="text-4xl font-bold">{analysis?.strengthScore || 0}</span>
            </div>
            <div>
              <p className="text-gray-700 mb-2">
                {analysis?.strengthScore > 80
                  ? "Excellent resume! You're ready to apply to top positions."
                  : analysis?.strengthScore > 60
                    ? "Good resume! Consider making improvements to increase competitiveness."
                    : "Your resume needs improvement. Follow the suggestions below."}
              </p>
            </div>
          </div>
        </Card>

        {/* Extracted Skills */}
        <Card className="mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Extracted Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {analysis?.skills?.map((skill: string) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Improvements */}
        <Card className="mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-orange-500" />
            Suggested Improvements
          </h2>
          <ul className="space-y-3">
            {analysis?.improvements?.map((improvement: string, i: number) => (
              <li key={i} className="flex gap-3">
                <span className="text-orange-500 font-semibold flex-shrink-0 w-6 text-center">
                  {i + 1}.
                </span>
                <p className="text-gray-700">{improvement}</p>
              </li>
            ))}
          </ul>
        </Card>

        {/* Suggested Job Titles */}
        <Card className="mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-500" />
            Recommended Job Titles
          </h2>
          <p className="text-gray-600 mb-4">Based on your resume, consider applying for these roles:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysis?.suggestedJobTitles?.map((title: string, i: number) => (
              <Link key={i} href={`/jobs?category=${encodeURIComponent(title)}`}>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <p className="font-semibold text-blue-600 hover:underline">{title}</p>
                  <p className="text-sm text-gray-500 mt-1">Find matching jobs →</p>
                </Card>
              </Link>
            ))}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Link href="/jobs">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Browse Jobs
            </Button>
          </Link>
          <Link href="/profile">
            <Button variant="outline">Edit Profile</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResumeAnalysisPage;