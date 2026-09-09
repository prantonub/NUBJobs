'use client';

import { FC, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useJobs } from '@/hooks/useJobs';
import JobCard from '@/components/jobs/JobCard';
import JobCardSkeleton from '@/components/jobs/JobCardSkeleton';
import JobFiltersForm from '@/components/jobs/JobFiltersForm';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LayoutGrid, List } from 'lucide-react';
import { Card } from '@/components/ui/card';

const JobsPageContent: FC = () => {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filters = {
    jobType: searchParams.get('jobType') || undefined,
    category: searchParams.get('category') || undefined,
    location: searchParams.get('location') || undefined,
    salaryMin: searchParams.get('salaryMin') ? parseInt(searchParams.get('salaryMin')!) : undefined,
    salaryMax: searchParams.get('salaryMax') ? parseInt(searchParams.get('salaryMax')!) : undefined,
    minCgpa: searchParams.get('minCgpa') ? parseFloat(searchParams.get('minCgpa')!) : undefined,
    postedDays: searchParams.get('postedDays')
      ? parseInt(searchParams.get('postedDays')!)
      : undefined,
    nubOnly: searchParams.get('nubOnly') === 'true',
    sort: searchParams.get('sort') || 'newest',
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
    limit: 10,
  };

  const { data, isLoading, error } = useJobs(filters);

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error loading jobs. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Job Listings</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <JobFiltersForm />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-gray-600">
                  {data?.pagination?.total || 0} jobs found
                </p>
              </div>

              <div className="flex gap-3">
                <Select
                  value={filters.sort}
                  onValueChange={(value) => {
                    const params = new URLSearchParams(searchParams);
                    params.set('sort', value);
                    params.set('page', '1');
                    window.location.href = `?${params.toString()}`;
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="salary-high">Highest Salary</SelectItem>
                    <SelectItem value="salary-low">Lowest Salary</SelectItem>
                    <SelectItem value="views">Most Viewed</SelectItem>
                    <SelectItem value="applicants">Most Applications</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-1 border rounded-md p-1">
                  <Button
                    size="sm"
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Job Cards */}
            {isLoading ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <JobCardSkeleton key={i} />
                ))}
              </div>
            ) : data?.data?.length ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}>
                {data.data.map((job: any) => (
                  <JobCard key={job.id} job={job} view={viewMode} />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-gray-600">No jobs found. Try adjusting your filters.</p>
              </Card>
            )}

            {/* Pagination */}
            {data?.pagination && data.pagination.pages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                {Array.from({ length: data.pagination.pages }).map((_, i) => {
                  const page = i + 1;
                  const isActive = page === filters.page;
                  return (
                    <Button
                      key={page}
                      variant={isActive ? 'default' : 'outline'}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams);
                        params.set('page', String(page));
                        window.location.href = `?${params.toString()}`;
                      }}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const JobsPage: FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JobsPageContent />
    </Suspense>
  );
};

export default JobsPage;