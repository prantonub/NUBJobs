'use client';

import { SocialNav, SocialShell } from '@/components/social/SocialNav';
import { UserCard } from '@/components/social/SocialUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserProfile, useUpdateProfile } from '@/hooks/useSocial';
import { useState } from 'react';
import { toast } from 'sonner';

/** /social/settings — account settings. */
export default function SettingsPage() {
  const profile = useUserProfile('me');
  const update = useUpdateProfile();

  const user = (profile.data as any)?.user;
  const [photo, setPhoto] = useState(user?.photo ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [website, setWebsite] = useState(user?.website ?? '');

  return (
    <SocialShell>
      <SocialNav title="Settings" subtitle="Manage your account and preferences." />

      <div className="max-w-2xl space-y-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Profile</h2>
          <div className="space-y-3">
            <label className="block text-xs font-medium">
              Name
              <Input value={user?.name ?? ''} readOnly className="mt-1" />
            </label>
            <label className="block text-xs font-medium">
              Username
              <Input value={user?.username ?? ''} readOnly className="mt-1" />
            </label>
            <label className="block text-xs font-medium">
              Photo URL
              <Input value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://…" className="mt-1" />
            </label>
            <label className="block text-xs font-medium">
              Bio ({bio.length}/150)
              <Textarea value={bio} maxLength={160} rows={3} onChange={(e) => setBio(e.target.value)} className="mt-1" />
            </label>
            <label className="block text-xs font-medium">
              Location
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Dhaka, Bangladesh" className="mt-1" />
            </label>
            <label className="block text-xs font-medium">
              Website
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" className="mt-1" />
            </label>
            <Button
              disabled={update.isPending}
              onClick={async () => {
                try {
                  await update.mutateAsync({ photo: photo || null, bio, location, website });
                  toast.success('Profile updated');
                } catch (err: any) {
                  toast.error(err?.response?.data?.message ?? 'Could not update profile');
                }
              }}
            >
              Save changes
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Account</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Authenticated as: <span className="text-foreground">{user?.username}</span></p>
            <p>Role: <span className="text-foreground">{user?.role}</span></p>
          </div>
        </div>
      </div>
    </SocialShell>
  );
}
