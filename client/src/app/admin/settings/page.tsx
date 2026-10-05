"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  useAdminAccounts,
  useCreateAdminAccount,
  usePlatformSettings,
  useUpdatePlatformSettings,
} from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/utils';

const SECTIONS: { title: string; keys: { key: string; label: string; textarea?: boolean }[] }[] = [
  {
    title: 'Platform settings',
    keys: [
      { key: 'platformName', label: 'Platform name' },
      { key: 'platformDescription', label: 'Platform description', textarea: true },
      { key: 'supportEmail', label: 'Support email' },
      { key: 'contactPhone', label: 'Contact phone' },
    ],
  },
  {
    title: 'Job approval settings',
    keys: [
      { key: 'requireJobApproval', label: 'Require approval (true/false)' },
      { key: 'autoApproveHours', label: 'Auto-approve after (hours)' },
      { key: 'minJobTitleLength', label: 'Min job title (chars)' },
      { key: 'minJobDescriptionLength', label: 'Min description (chars)' },
      { key: 'maxFeaturedJobs', label: 'Max featured jobs' },
    ],
  },
];

export default function AdminSettingsPage() {
  const { data: settings, isLoading } = usePlatformSettings();
  const saveSettings = useUpdatePlatformSettings();
  const { data: admins } = useAdminAccounts();
  const createAdmin = useCreateAdminAccount();

  const [form, setForm] = useState<Record<string, string>>({});
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', adminRole: 'SUPPORT_TEAM' });

  useEffect(() => {
    if (settings) setForm((prev) => ({ ...settings, ...prev }));
  }, [settings]);

  const onSaveSection = async (keys: string[]) => {
    try {
      const payload: Record<string, string> = {};
      for (const k of keys) if (k in form) payload[k] = form[k];
      await saveSettings.mutateAsync(payload);
      toast.success('Settings saved');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to save settings'));
    }
  };

  const onCreateAdmin = async () => {
    try {
      const res: any = await createAdmin.mutateAsync(newAdmin as any);
      toast.success(res?.tempPassword ? `Admin created · temp password: ${res.tempPassword}` : 'Admin created');
      setNewAdmin({ name: '', email: '', adminRole: 'SUPPORT_TEAM' });
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to create admin'));
    }
  };

  if (isLoading) {
    return <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      {SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader><CardTitle>{section.title}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {section.keys.map(({ key, label, textarea }) =>
              textarea ? (
                <div key={key} className="md:col-span-2">
                  <label className="mb-1 block text-sm text-muted-foreground" htmlFor={`set-${key}`}>{label}</label>
                  <Textarea
                    id={`set-${key}`}
                    rows={3}
                    value={form[key] ?? ''}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ) : (
                <div key={key}>
                  <label className="mb-1 block text-sm text-muted-foreground" htmlFor={`set-${key}`}>{label}</label>
                  <Input
                    id={`set-${key}`}
                    value={form[key] ?? ''}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              )
            )}
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={() => onSaveSection(section.keys.map((k) => k.key))} disabled={saveSettings.isPending}>
                Save {section.title.toLowerCase()}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Admin management
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/audit-logs">View audit logs</Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Input
              placeholder="Name"
              value={newAdmin.name}
              onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
            />
            <Input
              type="email"
              placeholder="Email"
              value={newAdmin.email}
              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
            />
            <select
              className="rounded-md border px-3 py-2 text-sm"
              aria-label="Admin role"
              value={newAdmin.adminRole}
              onChange={(e) => setNewAdmin({ ...newAdmin, adminRole: e.target.value })}
            >
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="CONTENT_MODERATOR">CONTENT_MODERATOR</option>
              <option value="SUPPORT_TEAM">SUPPORT_TEAM</option>
            </select>
            <Button onClick={onCreateAdmin} disabled={!newAdmin.name || !newAdmin.email || createAdmin.isPending}>
              Add admin
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Tier</th>
                </tr>
              </thead>
              <tbody>
                {((admins as any) ?? []).length === 0 ? (
                  <tr><td colSpan={4} className="p-3 text-muted-foreground">No admin accounts.</td></tr>
                ) : (
                  (admins as any[]).map((a: any) => (
                    <tr key={a.id} className="border-b">
                      <td className="p-3 font-medium">{a.name}</td>
                      <td className="p-3">{a.email}</td>
                      <td className="p-3"><Badge variant="secondary">{a.role}</Badge></td>
                      <td className="p-3"><Badge variant="outline">{a.adminRole}</Badge></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

