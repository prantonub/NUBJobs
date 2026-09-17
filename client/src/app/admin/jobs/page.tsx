"use client";

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { adminApi } from '@/lib/api/admin.api';
import { getErrorMessage } from '@/lib/utils';
import { useJobCategories } from '@/hooks/useJobs';

type JobRow = {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  type?: string | null;
  location?: string | null;
  status: string;
  featured?: boolean;
  createdAt?: string;
  employer?: { companyName?: string | null } | null;
};

type Company = {
  id: string;
  companyName: string;
};

/** Must match the `JobType` enum used by the API. */
const JOB_TYPE_OPTIONS = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'REMOTE', label: 'Remote' },
  { value: 'HYBRID', label: 'Hybrid' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active (visible on the job page)' },
  { value: 'PENDING', label: 'Pending review (hidden)' },
  { value: 'DRAFT', label: 'Draft (hidden)' },
];

const emptyForm = {
  title: '',
  description: '',
  category: '',
  location: '',
  type: 'FULL_TIME',
  employerId: '',
  salaryMin: '',
  salaryMax: '',
  minCgpa: '',
  skills: '',
  deadline: '',
  targetUniversity: 'ALL',
  status: 'ACTIVE',
};

const statusBadgeVariant = (status: string) => {
  if (status === 'ACTIVE') return 'outline' as const;
  if (status === 'PENDING') return 'secondary' as const;
  return 'destructive' as const;
};

export default function AdminJobsPage() {
  const queryClient = useQueryClient();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const { data: jobCategories } = useJobCategories();

  const categoryOptions = useMemo(() => {
    const live = (jobCategories ?? []).map((category) => category.label);
    const fromJobs = jobs.map((job) => job.category).filter(Boolean) as string[];
    return Array.from(new Set([...live, ...fromJobs])).sort((a, b) => a.localeCompare(b));
  }, [jobCategories, jobs]);

  /** Keep the public job page / category list in sync with admin changes. */
  const refreshPublicLists = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['jobs'] }),
      queryClient.invalidateQueries({ queryKey: ['jobCategories'] }),
    ]);
  };

  const loadJobs = async () => {
    try {
      setLoading(true);
      const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token');
      if (!hasToken) {
        setJobs([]);
        return;
      }
      const { data } = await adminApi.jobs();
      setJobs(data?.data ?? []);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not load jobs. Sign in as an admin first.'));
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const { data } = await adminApi.employers();
      setCompanies(data?.data ?? []);
    } catch {
      setCompanies([]);
    }
  };

  useEffect(() => {
    loadJobs();
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createJob = async () => {
    if (form.title.trim().length < 3) {
      toast.error('Job title must be at least 3 characters.');
      return;
    }
    if (form.description.trim().length < 20) {
      toast.error('Job description must be at least 20 characters.');
      return;
    }

    try {
      setSubmitting(true);
      await adminApi.createJob({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim() || undefined,
        type: form.type,
        location: form.location.trim() || undefined,
        employerId: form.employerId || undefined,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
        minCgpa: form.minCgpa ? Number(form.minCgpa) : undefined,
        skills: form.skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean),
        deadline: form.deadline || undefined,
        targetUniversity: form.targetUniversity,
        status: form.status,
      });
      const createdAsActive = form.status === 'ACTIVE';
      setForm(emptyForm);
      await loadJobs();
      await refreshPublicLists();
      toast.success(
        createdAsActive
          ? 'Job posted — it is now live on the Job Listings page.'
          : 'Job saved. Approve it to make it live on the Job Listings page.'
      );
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not create the job.'));
    } finally {
      setSubmitting(false);
    }
  };

  const approve = async (jobId: string) => {
    try {
      await adminApi.updateJobStatus(jobId, 'APPROVED');
      await loadJobs();
      await refreshPublicLists();
      toast.success('Job approved and published to the job page.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not approve the job.'));
    }
  };

  const reject = async (jobId: string) => {
    try {
      await adminApi.updateJobStatus(jobId, 'REJECTED');
      await loadJobs();
      await refreshPublicLists();
      toast.success('Job rejected and removed from the job page.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not reject the job.'));
    }
  };

  const toggleFeature = async (jobId: string) => {
    try {
      await adminApi.toggleJobFeature(jobId);
      await loadJobs();
      await refreshPublicLists();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update the featured flag.'));
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      await adminApi.deleteJob(jobId);
      await loadJobs();
      await refreshPublicLists();
      toast.success('Job deleted.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete the job.'));
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (statusFilter !== 'ALL' && job.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && (job.category ?? '') !== categoryFilter) return false;
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      const haystack = `${job.title} ${job.employer?.companyName ?? ''} ${job.location ?? ''}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="mb-1 text-lg font-semibold">Create Job from Admin</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Jobs posted as <strong>Active</strong> appear immediately on the public Job Listings page.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Job title *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <select
            className="rounded-md border px-3 py-2"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {JOB_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Input
            list="admin-job-categories"
            placeholder="Category (e.g. Software Engineering)"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <datalist id="admin-job-categories">
            {categoryOptions.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <Input
            placeholder="Location (e.g. Dhaka)"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <select
            className="rounded-md border px-3 py-2"
            value={form.employerId}
            onChange={(e) => setForm({ ...form, employerId: e.target.value })}
          >
            <option value="">Company: auto (most recent)</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.companyName}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border px-3 py-2"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Input
            type="number"
            placeholder="Salary min (৳)"
            value={form.salaryMin}
            onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Salary max (৳)"
            value={form.salaryMax}
            onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
          />
          <Input
            type="number"
            step="0.01"
            min="0"
            max="4"
            placeholder="Minimum CGPA (e.g. 3.0)"
            value={form.minCgpa}
            onChange={(e) => setForm({ ...form, minCgpa: e.target.value })}
          />
          <Input
            placeholder="Skills (comma separated)"
            value={form.skills}
            onChange={(e) => setForm({ ...form, skills: e.target.value })}
          />
          <input
            type="date"
            aria-label="Application deadline"
            className="rounded-md border px-3 py-2"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          />
          <select
            className="rounded-md border px-3 py-2"
            value={form.targetUniversity}
            onChange={(e) => setForm({ ...form, targetUniversity: e.target.value })}
          >
            <option value="ALL">Open to all universities</option>
            <option value="NUB">NUB students only</option>
          </select>
          <div className="md:col-span-2">
            <Textarea
              placeholder="Job description * (min 20 characters)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {companies.length === 0
              ? 'No company found — create one from the Companies page first.'
              : `${companies.length} company${companies.length === 1 ? '' : 'ies'} available.`}
          </p>
          <Button onClick={createJob} disabled={submitting}>
            {submitting ? 'Posting…' : 'Post Job'}
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Job Management</h2>
            <p className="text-sm text-muted-foreground">
              All job posts from every category. Approving a job publishes it to the public
              Job Listings page; rejecting hides it.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search job or company"
              aria-label="Search jobs"
              className="w-56"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="rounded-md border px-3 py-2"
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="DRAFT">Draft</option>
              <option value="CLOSED">Closed</option>
            </select>
            <select
              className="rounded-md border px-3 py-2"
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground">Loading jobs...</p>
          ) : filteredJobs.length === 0 ? (
            <p className="text-muted-foreground">
              No job posts to show. Create one above — active jobs appear here and on the
              public Job Listings page instantly.
            </p>
          ) : (
            filteredJobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold">
                    {job.title}
                    {job.featured && (
                      <span className="ml-2 text-xs font-medium text-amber-600">Featured</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {job.employer?.companyName ?? 'Admin created'} • {job.category ?? 'General'} •{' '}
                    {job.location ?? 'Remote'} • {(job.type ?? 'FULL_TIME').replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={statusBadgeVariant(job.status)}>{job.status}</Badge>
                  <Button variant="outline" size="sm" onClick={() => approve(job.id)}>
                    Approve
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => reject(job.id)}>
                    Reject
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleFeature(job.id)}>
                    {job.featured ? 'Unfeature' : 'Feature'}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteJob(job.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
