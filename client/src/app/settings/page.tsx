'use client';

import { useState } from 'react';
import { BellIcon, LogOutIcon, MoonIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  return <div className="space-y-6"><div><h1 className="font-heading text-2xl font-bold">Account Settings</h1><p className="mt-1 text-sm text-muted-foreground">Control your account details and job-search preferences.</p></div><Card className="p-5"><h2 className="font-semibold">Account</h2><div className="mt-4 space-y-3 text-sm"><div><p className="text-muted-foreground">Name</p><p className="font-medium">{user?.name ?? 'Your name'}</p></div><div><p className="text-muted-foreground">Email</p><p className="font-medium">{user?.email ?? 'Your email'}</p></div></div></Card><Card className="p-5"><h2 className="font-semibold">Preferences</h2><div className="mt-4 space-y-4"><label className="flex items-center justify-between gap-4 text-sm"><span className="flex items-center gap-2"><BellIcon className="size-4" />Email job updates</span><input type="checkbox" checked={emailUpdates} onChange={(event) => setEmailUpdates(event.target.checked)} /></label><label className="flex items-center justify-between gap-4 text-sm"><span className="flex items-center gap-2"><MoonIcon className="size-4" />Compact dashboard layout</span><input type="checkbox" checked={compactMode} onChange={(event) => setCompactMode(event.target.checked)} /></label></div></Card><Card className="p-5"><h2 className="font-semibold">Session</h2><Button variant="destructive" className="mt-4" onClick={() => logout()}><LogOutIcon className="mr-2 size-4" />Log out</Button></Card></div>;
}