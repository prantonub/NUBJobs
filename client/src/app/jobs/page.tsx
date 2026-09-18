'use client';

import { FC, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useJobs } from '@/hooks/useJobs';
import JobCard from '@/components/jobs/JobCard';
import JobCardSkeleton from '@/components/jobs/JobCardSkeleton';
import JobFiltersForm from '@/components/jobs/JobFiltersForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LayoutGrid, List, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';

type JobListItem = React.ComponentProps<typeof JobCard>['job'];

const JobsPageContent: FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const urlKeyword = searchParams.get('q') ?? '';
  const [keyword, setKeyword] = useState(urlKeyword);
  const [syncedKeyword, setSyncedKeyword] = useState(urlKeyword);

  // Adjust the search box while rendering when the URL changes (hero search,
  // footer links, back button) — the recommended alternative to an effect.
  if (urlKeyword !== syncedKeyword) {
    setSyncedKeyword(urlKeyword);
    setKeyword(urlKeyword);
  }

  const filters = {
    q: searchParams.get('q') || undefined,
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
    // 12 = 4 full rows of the 3-column card grid. A non-multiple (e.g. 10)
    // leaves a lone card on the last row of every page and the page reads as
    // "9 jobs" — matching the grid avoids the odd-looking orphan row.
    limit: 12,
  };

  const { data, isLoading, error } = useJobs(filters);

  const updateQuery = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    });
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateQuery({ q: keyword.trim() || null, page: '1' });
  };

  const activeCategory = searchParams.get('category');
  const activeKeyword = searchParams.get('q');

  /** 1 card on mobile, 2 on tablet, 3 on desktop. */
  const cardsContainerClass =
    viewMode === 'grid'
      ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'
      : 'space-y-4';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-2">Job Listings</h1>
        <p className="text-gray-600 mb-6">
          All open jobs and internships across every category.
        </p>

        {/* Keyword search */}
        <form onSubmit={handleSearch} className="mb-6 flex gap-2">
          <div className="relative flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by job title, company or keyword"
              aria-label="Search jobs"
              className="pl-9 bg-white"
            />
          </div>
          <Button type="submit">Search</Button>
          {(activeKeyword || activeCategory) && (
            <Button
              type="button"
              variant="outline"
              onClick={() => updateQuery({ q: null, category: null, page: '1' })}
            >
              Clear
            </Button>
          )}
        </form>

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
                  {data?.pagination
                    ? `Showing ${Math.min(
                        (data.pagination.page - 1) * data.pagination.limit + 1,
                        data.pagination.total
                      )}–${Math.min(
                        data.pagination.page * data.pagination.limit,
                        data.pagination.total
                      )} of ${data.pagination.total} jobs`
                    : 'Loading jobs…'}
                  {activeCategory && (
                    <span className="ml-2 text-sm text-gray-500">
                      in “{activeCategory}”
                    </span>
                  )}
                </p>
              </div>

              <div className="flex gap-3">
                <Select
                  value={filters.sort}
                  onValueChange={(value) => updateQuery({ sort: value, page: '1' })}
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
                    type="button"
                    size="sm"
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    aria-label="Grid view"
                    aria-pressed={viewMode === 'grid'}
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="w-4 h-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    aria-label="List view"
                    aria-pressed={viewMode === 'list'}
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Job Cards */}
            {error ? (
              <Card className="p-8 text-center">
                <p className="text-red-600">Error loading jobs. Please try again.</p>
              </Card>
            ) : isLoading ? (
              <div className={cardsContainerClass}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <JobCardSkeleton key={i} />
                ))}
              </div>
            ) : data?.data?.length ? (
              <div className={cardsContainerClass}>
                {data.data.map((job: JobListItem) => (
                  <JobCard key={job.id} job={job} view={viewMode} />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-gray-600">
                  No jobs found. Try adjusting your filters.
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  New job posts appear here as soon as an admin or employer publishes them.
                </p>
                {(activeCategory || activeKeyword) && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => updateQuery({ q: null, category: null, page: '1' })}
                  >
                    Clear search & filters
                  </Button>
                )}
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
                      onClick={() => updateQuery({ page: String(page) })}
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