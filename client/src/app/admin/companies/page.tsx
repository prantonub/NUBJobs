"use client";

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { adminApi } from '@/lib/api/admin.api';

const emptyForm = {
  companyName: '',
  name: '',
  email: '',
  password: 'Password123!',
  website: '',
  linkedinUrl: '',
  about: '',
};

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token');
      if (!hasToken) {
        setCompanies([]);
        return;
      }
      const { data } = await adminApi.employers();
      setCompanies(data?.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const createCompany = async () => {
    await adminApi.createCompany(form);
    setForm(emptyForm);
    await loadCompanies();
  };

  const approve = async (id: string) => {
    await adminApi.updateEmployerVerification(id, true, 'Approved by admin');
    await loadCompanies();
  };

  const reject = async (id: string) => {
    await adminApi.updateEmployerVerification(id, false, 'Rejected by admin');
    await loadCompanies();
  };

  const deleteCompany = async (id: string) => {
    await adminApi.deleteCompany(id);
    await loadCompanies();
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="mb-3 text-lg font-semibold">Create Company from Admin</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Company name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          <Input placeholder="Admin full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input type="email" placeholder="Admin email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Input placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          <Input placeholder="LinkedIn URL" value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} />
          <div className="md:col-span-2">
            <Textarea placeholder="About company" value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} rows={3} />
          </div>
        </div>
        <div className="mt-3 flex justify-end"><Button onClick={createCompany}>Create Company</Button></div>
      </Card>

      <Card className="p-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Company Verification</h2>
          <p className="text-sm text-muted-foreground">Review submitted business documents.</p>
        </div>

        <div className="space-y-3">
          {loading ? <p className="text-muted-foreground">Loading companies...</p> : companies.map((company) => (
            <div key={company.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">{company.companyName || company.user?.name}</p>
                <p className="text-sm text-muted-foreground">{company.user?.email} • {company._count?.jobs ?? 0} jobs</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={company.isVerified ? 'outline' : 'secondary'}>{company.isVerified ? 'APPROVED' : 'PENDING'}</Badge>
                <Button variant="outline" size="sm" onClick={() => approve(company.id)}>Approve</Button>
                <Button variant="secondary" size="sm" onClick={() => reject(company.id)}>Reject</Button>
                <Button variant="destructive" size="sm" onClick={() => deleteCompany(company.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
