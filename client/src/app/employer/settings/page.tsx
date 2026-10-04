'use client';

import type { FC } from 'react';
import Link from 'next/link';
import { LogOutIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeleteAccountSection } from '@/components/account/DeleteAccountSection';

/**
 * /employer/settings — account details, shortcuts into the company hub and
 * the danger-zone account deletion card (employer role).
 */
const EmployerSettingsPage: FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and company workspace.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold">Account</h2>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Name</p>
            <p className="font-medium">{user?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{user?.email ?? '—'}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">Company</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Logo, about section, social links and verification are managed in the
          company hub.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/employer/company?tab=settings">Edit company profile</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/employer/company?tab=settings">Verification status</Link>
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">Session</h2>
        <Button variant="destructive" className="mt-4" onClick={() => logout()}>
          <LogOutIcon className="mr-2 size-4" />
          Log out
        </Button>
      </Card>

      {/* Danger zone — permanently delete the employer account. */}
      <DeleteAccountSection requiredRole="EMPLOYER" />
    </div>
  );
};

export default EmployerSettingsPage;
