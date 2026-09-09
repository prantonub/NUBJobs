'use client';

import { FC } from 'react';
import Link from 'next/link';
import { MapPin, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Job {
  id: string;
  title: string;
  description: string;
  location?: string;
  type: string;
  salaryMin?: number;
  salaryMax?: number;
  employer: {
    companyName: string;
    logoUrl?: string;
  };
  skills: string[];
  applicantCount: number;
  createdAt: string;
}

interface JobCardProps {
  job: Job;
  view?: 'grid' | 'list';
}

const JobCard: FC<JobCardProps> = ({ job, view = 'grid' }) => {
  const salaryDisplay =
    job.salaryMin && job.salaryMax
      ? `৳${job.salaryMin.toLocaleString()}-${job.salaryMax.toLocaleString()}`
      : job.salaryMin
        ? `৳${job.salaryMin.toLocaleString()}+`
        : 'Not specified';

  const postedDate = new Date(job.createdAt);
  const daysAgo = Math.floor((Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24));
  const dateDisplay =
    daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;

  if (view === 'list') {
    return (
      <Card className="p-4 mb-3 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Link href={`/jobs/${job.id}`}>
              <h3 className="text-lg font-semibold text-blue-600 hover:underline">
                {job.title}
              </h3>
            </Link>
            <p className="text-sm text-gray-600 mt-1">{job.employer.companyName}</p>
            <p className="text-sm text-gray-500 line-clamp-2 mt-2">{job.description}</p>

            <div className="flex flex-wrap gap-2 mt-3">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                {job.location || 'Remote'}
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <DollarSign className="w-4 h-4" />
                {salaryDisplay}
              </div>
              <Badge variant="outline">{job.type}</Badge>
            </div>

            <div className="flex flex-wrap gap-1 mt-3">
              {job.skills.slice(0, 3).map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
              {job.skills.length > 3 && (
                <Badge variant="outline">+{job.skills.length - 3}</Badge>
              )}
            </div>
          </div>

          <div className="text-right ml-4">
            <Link href={`/jobs/${job.id}`}>
              <Button variant="outline" size="sm">
                View
              </Button>
            </Link>
            <p className="text-xs text-gray-500 mt-2">{dateDisplay}</p>
            <p className="text-xs text-gray-500">{job.applicantCount} applicants</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Link href={`/jobs/${job.id}`}>
      <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
        {job.employer.logoUrl && (
          <img
            src={job.employer.logoUrl}
            alt={job.employer.companyName}
            className="w-12 h-12 rounded object-cover mb-3"
          />
        )}

        <h3 className="text-lg font-semibold line-clamp-2 mb-1">{job.title}</h3>
        <p className="text-sm text-gray-600 mb-3">{job.employer.companyName}</p>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3 flex-1">{job.description}</p>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            {job.location || 'Remote'}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <DollarSign className="w-4 h-4" />
            {salaryDisplay}
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {job.skills.slice(0, 2).map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
        </div>

        <p className="text-xs text-gray-500">{dateDisplay}</p>
      </Card>
    </Link>
  );
};

export default JobCard;