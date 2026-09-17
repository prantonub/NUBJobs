'use client';

import { FC, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useJobCategories } from '@/hooks/useJobs';

interface JobFiltersFormProps {
  onFiltersChange?: (filters: Record<string, string>) => void;
}

/** Job types must match the `JobType` enum used by the API. */
const JOB_TYPE_OPTIONS = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'REMOTE', label: 'Remote' },
  { value: 'HYBRID', label: 'Hybrid' },
] as const;

/** Used until the live category list arrives (or if the API is unreachable). */
const FALLBACK_CATEGORIES = [
  'Software Engineering',
  'Marketing',
  'Finance',
  'Design',
  'Data Science',
  'Business Development',
];

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const JobFiltersForm: FC<JobFiltersFormProps> = ({ onFiltersChange }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: apiCategories } = useJobCategories();

  const activeCategory = searchParams.get('category') ?? '';

  const categories =
    apiCategories && apiCategories.length > 0
      ? apiCategories.map((category) => ({
          label: category.label,
          value: category.value,
          slug: category.slug,
          count: category.count,
        }))
      : FALLBACK_CATEGORIES.map((label) => ({
          label,
          value: label,
          slug: slugify(label),
          count: undefined as number | undefined,
        }));

  const handleFilterChange = useCallback(
    (key: string, value: unknown) => {
      const params = new URLSearchParams(searchParams);
      if (value === '' || value === null || value === undefined) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
      params.set('page', '1'); // Reset to first page
      onFiltersChange?.(Object.fromEntries(params.entries()));
      router.push(`?${params.toString()}`);
    },
    [router, searchParams, onFiltersChange]
  );

  return (
    <Card className="p-4 space-y-6">
      {/* Job Type */}
      <div>
        <h3 className="font-semibold mb-3">Job Type</h3>
        <div className="space-y-2">
          {JOB_TYPE_OPTIONS.map(({ value, label }) => (
            <div key={value} className="flex items-center space-x-2">
              <Checkbox
                id={`type-${value}`}
                checked={searchParams.get('jobType') === value}
                onCheckedChange={(checked) =>
                  handleFilterChange('jobType', checked ? value : '')
                }
              />
              <Label htmlFor={`type-${value}`} className="cursor-pointer">
                {label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <h3 className="font-semibold mb-3">Category</h3>
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category.slug} className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category.slug}`}
                checked={slugify(activeCategory) === category.slug}
                onCheckedChange={(checked) =>
                  handleFilterChange('category', checked ? category.value : '')
                }
              />
              <Label htmlFor={`category-${category.slug}`} className="cursor-pointer">
                {category.label}
                {typeof category.count === 'number' && (
                  <span className="ml-1 text-xs text-muted-foreground">({category.count})</span>
                )}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Salary Range */}
      <div>
        <h3 className="font-semibold mb-3">Salary Range (৳)</h3>
        <div className="space-y-2">
          <Input
            type="number"
            placeholder="Min"
            value={searchParams.get('salaryMin') || ''}
            onChange={(e) => handleFilterChange('salaryMin', e.target.value)}
          />
          <Input
            type="number"
            placeholder="Max"
            value={searchParams.get('salaryMax') || ''}
            onChange={(e) => handleFilterChange('salaryMax', e.target.value)}
          />
        </div>
      </div>

      {/* CGPA Filter */}
      <div>
        <h3 className="font-semibold mb-3">Minimum CGPA</h3>
        <Input
          type="number"
          step="0.1"
          min="0"
          max="4"
          placeholder="e.g., 3.0"
          value={searchParams.get('minCgpa') || ''}
          onChange={(e) => handleFilterChange('minCgpa', e.target.value)}
        />
      </div>

      {/* Posted Days */}
      <div>
        <h3 className="font-semibold mb-3">Posted In Last</h3>
        <div className="space-y-2">
          {[
            { label: 'Last 7 days', value: 7 },
            { label: 'Last 30 days', value: 30 },
            { label: 'Last 90 days', value: 90 },
          ].map(({ label, value }) => (
            <div key={value} className="flex items-center space-x-2">
              <Checkbox
                id={`days-${value}`}
                checked={searchParams.get('postedDays') === String(value)}
                onCheckedChange={(checked) =>
                  handleFilterChange('postedDays', checked ? value : '')
                }
              />
              <Label htmlFor={`days-${value}`} className="cursor-pointer">
                {label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* NUB Only Toggle */}
      <div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="nubOnly"
            checked={searchParams.get('nubOnly') === 'true'}
            onCheckedChange={(checked) => handleFilterChange('nubOnly', checked ? 'true' : '')}
          />
          <Label htmlFor="nubOnly" className="cursor-pointer font-semibold">
            NUB Only
          </Label>
        </div>
        <p className="text-xs text-gray-500 mt-1">Show jobs targeted for NUB students</p>
      </div>

      {/* Clear Filters */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => router.push('/jobs')}
      >
        Clear All Filters
      </Button>
    </Card>
  );
};

export default JobFiltersForm;