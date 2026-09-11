'use client';

import { FC } from 'react';
import Link from 'next/link';
import { useEmployerStats, useEmployerJobs, useEmployerApplications } from '@/hooks/useEmployer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Briefcase, Users, TrendingUp, Eye } from 'lucide-react';

const EmployerDashboardPage: FC = () => {
  const { data: stats, isLoading: statsLoading } = useEmployerStats();
  const { data: jobsData } = useEmployerJobs();
  const { data: applicationsData } = useEmployerApplications();

  const chartData = stats
    ? [
        { name: 'Applied', count: stats.statusCounts?.APPLIED || 0 },
        { name: 'Reviewed', count: stats.statusCounts?.REVIEWED || 0 },
        { name: 'Shortlisted', count: stats.statusCounts?.SHORTLISTED || 0 },
        { name: 'Interviewed', count: stats.statusCounts?.INTERVIEWED || 0 },
        { name: 'Hired', count: stats.statusCounts?.HIRED || 0 },
      ]
    : [];

  const statCards = [
    {
      label: 'Posted Jobs',
      value: stats?.totalJobs || 0,
      icon: Briefcase,
      color: 'bg-blue-500',
    },
    {
      label: 'Active Jobs',
      value: stats?.activeJobs || 0,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      label: 'Applications',
      value: stats?.totalApplications || 0,
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      label: 'Profile Views',
      value: 0,
      icon: Eye,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Employer Dashboard</h1>
          <Link href="/employer/post-job">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Post New Job
            </Button>
          </Link>
        </div>

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
                <p className="text-3xl font-bold">{card.value}</p>
              </Card>
            );
          })}
        </div>

        {/* Applications Chart */}
        <Card className="mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">Applications Pipeline</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#667eea" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No applications yet</p>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Posted Jobs Table */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Recent Jobs</h2>
                <Link href="/employer/jobs">
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
                      <th className="text-left py-3 px-3">Applications</th>
                      <th className="text-left py-3 px-3">Status</th>
                      <th className="text-left py-3 px-3">Posted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobsData?.data?.slice(0, 5).map((job: any) => (
                      <tr key={job.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-3">
                          <Link href={`/employer/jobs/${job.id}`} className="text-blue-600 hover:underline">
                            {job.title}
                          </Link>
                        </td>
                        <td className="py-3 px-3">{job._count?.applications || 0}</td>
                        <td className="py-3 px-3">
                          <Badge variant={job.status === 'ACTIVE' ? 'default' : 'outline'}>
                            {job.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Recent Applicants */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Recent Applicants</h3>
            <div className="space-y-3">
              {applicationsData && Object.values(applicationsData).flat().length > 0 ? (
                Object.values(applicationsData)
                  .flat()
                  .slice(0, 5)
                  .map((app: any) => (
                    <Link key={app.id} href={`/employer/applications/${app.id}`}>
                      <div className="p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition">
                        <p className="font-medium text-sm">
                          {app.student?.user?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-600">{app.job?.title}</p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {app.status}
                        </Badge>
                      </div>
                    </Link>
                  ))
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">No applicants yet</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmployerDashboardPage;