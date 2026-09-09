'use client';

import { FC } from 'react';
import Link from 'next/link';
import { useApplicationStats } from '@/hooks/useApplications';
import { useProfile, useProfileCompletion } from '@/hooks/useProfile';
import { useRecommendedJobs } from '@/hooks/useJobs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Briefcase, Heart, TrendingUp, CheckCircle } from 'lucide-react';
import JobCard from '@/components/jobs/JobCard';

const DashboardPage: FC = () => {
  const { data: stats } = useApplicationStats();
  const { data: profile } = useProfile();
  const { data: completion } = useProfileCompletion();
  const { data: recommendedJobs } = useRecommendedJobs();

  const statCards = [
    {
      label: 'Applications',
      value: stats?.total || 0,
      icon: Briefcase,
      color: 'bg-blue-500',
    },
    {
      label: 'Interviews',
      value: stats?.interviewed || 0,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      label: 'Saved Jobs',
      value: 0,
      icon: Heart,
      color: 'bg-red-500',
    },
    {
      label: 'Match Rate',
      value: stats?.avgMatchScore ? Math.round(stats.avgMatchScore) : 0,
      suffix: '%',
      icon: CheckCircle,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        {/* Profile Completion Banner */}
        {completion && (
          <Card className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Complete Your Profile</h3>
                <p className="text-sm text-gray-600 mb-3">
                  {completion.percentage < 100
                    ? `${100 - completion.percentage}% to go! Complete all sections to improve job matches.`
                    : 'Great! Your profile is complete.'}
                </p>
                <Progress value={completion.percentage} className="h-2" />
              </div>
              <Link href="/profile">
                <Button className="ml-6">Edit Profile</Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <Card key={i} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`${card.color} p-3 rounded-lg text-white`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">{card.label}</p>
                <p className="text-3xl font-bold">
                  {card.value}
                  {card.suffix && card.suffix}
                </p>
              </Card>
            );
          })}
        </div>

        {/* Recent Applications */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Recent Applications</h2>
                <Link href="/applications">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-3 px-3">Job Title</th>
                      <th className="text-left py-3 px-3">Company</th>
                      <th className="text-left py-3 px-3">Status</th>
                      <th className="text-left py-3 px-3">Applied</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="py-3 px-3">Frontend Developer</td>
                      <td className="py-3 px-3">TechCorp</td>
                      <td className="py-3 px-3">
                        <Badge variant="secondary">Applied</Badge>
                      </td>
                      <td className="py-3 px-3 text-gray-600">2 days ago</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Profile Stats */}
          <div>
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Your Profile</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-semibold">{profile?.user?.name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">NUB ID</p>
                  <p className="font-semibold">{profile?.nubId || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">CGPA</p>
                  <p className="font-semibold">{profile?.cgpa?.toFixed(2) || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Skills</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {profile?.skills?.slice(0, 3).map((skill: string) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {profile?.skills?.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{profile.skills.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Recommended Jobs */}
        {recommendedJobs && recommendedJobs.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Recommended Jobs</h2>
              <Link href="/jobs">
                <Button variant="outline" size="sm">
                  See All Jobs
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendedJobs.map((job: any) => (
                <JobCard key={job.id} job={job} view="grid" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;