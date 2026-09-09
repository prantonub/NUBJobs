'use client';

import { FC, useState } from 'react';
import { useParams } from 'next/navigation';
import { useJobDetail, useJobMatchScore, useCheckJobSaved, useSaveJob, useUnsaveJob } from '@/hooks/useJobs';
import ApplyModal from '@/components/jobs/ApplyModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Share2, Briefcase, MapPin, DollarSign, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const JobDetailPage: FC = () => {
  const params = useParams();
  const jobId = params.id as string;
  
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const { data: job, isLoading: jobLoading } = useJobDetail(jobId);
  const { data: matchScore } = useJobMatchScore(jobId);
  const { data: isSaved } = useCheckJobSaved(jobId);
  const saveJobMutation = useSaveJob();
  const unsaveJobMutation = useUnsaveJob();

  if (jobLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!job) {
    return <div className="flex justify-center items-center min-h-screen">Job not found</div>;
  }

  const handleSaveJob = async () => {
    try {
      if (isSaved) {
        await unsaveJobMutation.mutateAsync(jobId);
        toast.success('Job removed from saved');
      } else {
        await saveJobMutation.mutateAsync(jobId);
        toast.success('Job saved!');
      }
    } catch (error) {
      toast.error('Failed to save job');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: job.title,
        text: `Check out this job: ${job.title} at ${job.employer?.companyName}`,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const salaryDisplay =
    job.salaryMin && job.salaryMax
      ? `৳${job.salaryMin.toLocaleString()}-${job.salaryMax.toLocaleString()}`
      : job.salaryMin
        ? `৳${job.salaryMin.toLocaleString()}+`
        : 'Not specified';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-600">
          <a href="/jobs" className="hover:text-blue-600">
            Jobs
          </a>
          <span className="mx-2">/</span>
          <span>{job.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
                  <p className="text-xl text-gray-600">{job.employer?.companyName}</p>
                </div>
                {job.employer?.isVerified && (
                  <Badge variant="default">Verified Employer</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Type</p>
                  <p className="font-semibold">{job.type.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Location</p>
                  <p className="font-semibold flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {job.location || 'Remote'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Salary</p>
                  <p className="font-semibold flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    {salaryDisplay}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Applicants</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {job.applicantCount}
                  </p>
                </div>
              </div>

              {job.deadline && (
                <div className="mt-4 flex items-center gap-2 text-sm text-orange-600">
                  <Calendar className="w-4 h-4" />
                  Deadline: {new Date(job.deadline).toLocaleDateString()}
                </div>
              )}
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="bg-white rounded-lg p-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="requirements">Requirements</TabsTrigger>
                <TabsTrigger value="company">Company</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <div className="prose prose-sm max-w-none">
                  <h3 className="font-semibold mb-3">About the Role</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
                </div>
              </TabsContent>

              <TabsContent value="requirements" className="mt-6">
                <div>
                  <h3 className="font-semibold mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {job.skills.map((skill: string) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  {job.minCgpa && (
                    <div>
                      <h3 className="font-semibold mb-2">Minimum CGPA</h3>
                      <p className="text-gray-700">{job.minCgpa.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="company" className="mt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">About {job.employer?.companyName}</h3>
                    <p className="text-gray-700">{job.employer?.about || 'No information available'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {job.employer?.website && (
                      <div>
                        <p className="text-sm text-gray-600">Website</p>
                        <a
                          href={job.employer.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {job.employer.website}
                        </a>
                      </div>
                    )}
                    {job.employer?.linkedinUrl && (
                      <div>
                        <p className="text-sm text-gray-600">LinkedIn</p>
                        <a
                          href={job.employer.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View Profile
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sticky Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4 space-y-4">
              {/* Match Score */}
              {matchScore !== undefined && (
                <div className="text-center pb-4 border-b">
                  <p className="text-sm text-gray-600 mb-2">AI Match Score</p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white">
                      <span className="text-2xl font-bold">{Math.round(matchScore)}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Based on your profile</p>
                </div>
              )}

              {/* Apply Button */}
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
                onClick={() => setApplyModalOpen(true)}
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Apply Now
              </Button>

              {/* Save Button */}
              <Button
                variant={isSaved ? 'default' : 'outline'}
                className="w-full"
                onClick={handleSaveJob}
                disabled={saveJobMutation.isPending || unsaveJobMutation.isPending}
              >
                <Heart className={`w-4 h-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
                {isSaved ? 'Saved' : 'Save Job'}
              </Button>

              {/* Share Button */}
              <Button variant="outline" className="w-full" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>

              {/* Info */}
              <div className="text-xs text-gray-500 text-center pt-4 border-t">
                <p>Posted {new Date(job.createdAt).toLocaleDateString()}</p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <ApplyModal
        open={applyModalOpen}
        onOpenChange={setApplyModalOpen}
        jobId={jobId}
        jobTitle={job.title}
      />
    </div>
  );
};

export default JobDetailPage;