"use client";

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { adminApi } from '@/lib/api/admin.api';

type JobRow = {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  type?: string | null;
  location?: string | null;
  status: string;
  featured?: boolean;
  employer?: { companyName?: string | null } | null;
};

const emptyForm = {
  title: '',
  description: '',
  category: '',
  location: '',
  type: 'FULL_TIME',
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const createJob = async () => {
    await adminApi.createJob({
      ...form,
      salaryMin: 0,
      salaryMax: 0,
      minCgpa: 2.5,
      skills: ['Admin Created'],
      status: 'ACTIVE',
    });
    setForm(emptyForm);
    await loadJobs();
  };

  const approve = async (jobId: string) => {
    await adminApi.updateJobStatus(jobId, 'APPROVED');
    await loadJobs();
  };

  const reject = async (jobId: string) => {
    await adminApi.updateJobStatus(jobId, 'REJECTED');
    await loadJobs();
  };

  const toggleFeature = async (jobId: string) => {
    await adminApi.toggleJobFeature(jobId);
    await loadJobs();
  };

  const deleteJob = async (jobId: string) => {
    await adminApi.deleteJob(jobId);
    await loadJobs();
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="mb-3 text-lg font-semibold">Create Job from Admin</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="rounded-md border px-3 py-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="FULL_TIME">Full Time</option>
            <option value="PART_TIME">Part Time</option>
            <option value="INTERNSHIP">Internship</option>
            <option value="REMOTE">Remote</option>
            <option value="HYBRID">Hybrid</option>
          </select>
          <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <div className="md:col-span-2">
            <Textarea placeholder="Job description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
          </div>
        </div>
        <div className="mt-3 flex justify-end"><Button onClick={createJob}>Post Job</Button></div>
      </Card>

      <Card className="p-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Job Management</h2>
          <p className="text-sm text-muted-foreground">Review, approve, reject, and feature job posts.</p>
        </div>

        <div className="space-y-3">
          {loading ? <p className="text-muted-foreground">Loading jobs...</p> : jobs.map((job) => (
            <div key={job.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">{job.title}</p>
                <p className="text-sm text-muted-foreground">{job.employer?.companyName ?? 'Admin created'} • {job.category ?? 'General'} • {job.location ?? 'Remote'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={job.status === 'ACTIVE' ? 'outline' : job.status === 'CLOSED' ? 'destructive' : 'secondary'}>
                  {job.status}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => approve(job.id)}>Approve</Button>
                <Button variant="secondary" size="sm" onClick={() => reject(job.id)}>Reject</Button>
                <Button variant="ghost" size="sm" onClick={() => toggleFeature(job.id)}>{job.featured ? 'Unfeature' : 'Feature'}</Button>
                <Button variant="destructive" size="sm" onClick={() => deleteJob(job.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
