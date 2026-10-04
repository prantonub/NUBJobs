'use client';

import { useState, type FC } from 'react';
import { toast } from 'sonner';
import { Loader2, ShieldAlert, Trash2 } from 'lucide-react';

import { useAuth, useDeleteAccount } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteAccountSectionProps {
  /**
   * Optional pin — e.g. the company settings tab only shows this to employers.
   * Without it the card renders for every deletable role (student *and*
   * employer); admins are excluded either way, so Google sign-ins of any
   * student/employer role always see it on /settings.
   */
  requiredRole?: 'STUDENT' | 'EMPLOYER';
}

const CONFIRM_WORD = 'DELETE';

/**
 * "Danger zone" card that permanently deletes the signed-in account.
 *
 * Confirmation depends on how the account signs in: local accounts must retype
 * their password, Google accounts (which have no usable password) are instead
 * asked to type `DELETE`. The server repeats both checks, so this part is UX
 * only — nothing here is trusted.
 */
export const DeleteAccountSection: FC<DeleteAccountSectionProps> = ({ requiredRole }) => {
  const { user } = useAuth();
  const deleteAccount = useDeleteAccount();

  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;
  // Only student/employer accounts can ever be deleted here (admins are
  // managed from the admin panel and get 403 from the server anyway).
  if (user.role !== 'STUDENT' && user.role !== 'EMPLOYER') return null;
  if (requiredRole && user.role !== requiredRole) return null;

  const isGoogleAccount = user.provider === 'google';
  const consequences =
    user.role === 'EMPLOYER'
      ? [
          'Your company profile, logo and verification documents',
          'Every job posting you have published',
          'Applications and messages on those postings',
        ]
      : [
          'Your profile, resume and photo',
          'Your applications and saved jobs',
          'Your conversations with employers',
        ];

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setConfirm('');
      setPassword('');
      setError(null);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (confirm.trim().toUpperCase() !== CONFIRM_WORD) {
      setError(`Type ${CONFIRM_WORD} to confirm`);
      return;
    }
    if (!isGoogleAccount && !password) {
      setError('Enter your current password');
      return;
    }

    try {
      await deleteAccount.mutateAsync(
        isGoogleAccount ? { confirmEmail: user.email } : { password }
      );
      handleOpenChange(false);
      toast.success('Your account has been deleted.');
      // Full navigation (not a client-side route change): nothing from the
      // deleted session — tokens, cached queries, socket — should survive.
      window.setTimeout(() => window.location.assign('/'), 1200);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Failed to delete your account.'));
    }
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-destructive">
              <ShieldAlert className="size-5" />
              Delete account
            </h2>
            <p className="text-sm text-muted-foreground">
              Permanently delete your NUBJobs account and everything attached to it. This
              action cannot be undone.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            className="shrink-0"
            onClick={() => handleOpenChange(true)}
          >
            <Trash2 className="mr-2 size-4" />
            Delete account
          </Button>
        </div>
      </Card>

      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>This permanently removes your account. It cannot be undone.</p>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {consequences.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            {isGoogleAccount ? (
              <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                This account signs in with Google ({user.email}), so there is no password
                to retype.
              </p>
            ) : (
              <label className="block space-y-1.5" htmlFor="delete-account-password">
                <span className="text-sm font-medium">Current password</span>
                <Input
                  id="delete-account-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                />
              </label>
            )}

            <label className="block space-y-1.5" htmlFor="delete-account-confirm">
              <span className="text-sm font-medium">
                Type <span className="font-semibold">{CONFIRM_WORD}</span> to confirm
              </span>
              <Input
                id="delete-account-confirm"
                autoComplete="off"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder={CONFIRM_WORD}
              />
            </label>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={deleteAccount.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleSubmit()}
              disabled={deleteAccount.isPending}
            >
              {deleteAccount.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-4" />
              )}
              Delete permanently
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DeleteAccountSection;
