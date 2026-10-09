'use client';

import { PostCard } from '@/components/social/PostCard';
import { SocialNav, SocialShell } from '@/components/social/SocialNav';
import { UserHeader } from '@/components/social/SocialUsers';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateProfile, useUserPosts, useUserProfile } from '@/hooks/useSocial';
import { use, useEffect, useState } from 'react';
import { toast } from 'sonner';

function EditProfileDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: { photo?: string | null; bio?: string | null; location?: string | null; website?: string | null };
}) {
  const update = useUpdateProfile();
  const [photo, setPhoto] = useState(initial.photo ?? '');
  const [bio, setBio] = useState(initial.bio ?? '');
  const [location, setLocation] = useState(initial.location ?? '');
  const [website, setWebsite] = useState(initial.website ?? '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block text-xs font-medium">
            Photo URL
            <Input className="mt-1" value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://…" />
          </label>
          <label className="block text-xs font-medium">
            Bio ({bio.length}/150)
            <Textarea value={bio} maxLength={160} rows={3} onChange={(e) => setBio(e.target.value)} placeholder="Who are you?" />
          </label>
          <label className="block text-xs font-medium">
            Location
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Dhaka, Bangladesh" />
          </label>
          <label className="block text-xs font-medium">
            Website
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
          </label>
        </div>
        <DialogFooter>
          <Button
            disabled={update.isPending}
            onClick={async () => {
              try {
                await update.mutateAsync({ photo: photo || null, bio, location, website });
                toast.success('Profile updated');
                onOpenChange(false);
              } catch (err: any) {
                toast.error(err?.response?.data?.message ?? 'Could not update profile');
              }
            }}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** /community/:username — social profile (header, stats, post history). */
export default function SocialProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const profile = useUserProfile(username);
  const [editorOpen, setEditorOpen] = useState(false);

  const u = (profile.data as any)?.user;
  const [accumulated, setAccumulated] = useState<any[]>([]);
  const [page, setPage] = useState(1);

  const myPosts = useUserPosts(username, page);
  useEffect(() => {
    const rows: any[] = (myPosts.data as any)?.posts ?? [];
    if (!rows.length) return;
    setAccumulated((prev) => {
      if (page === 1) return rows;
      const ids = new Set(prev.map((p) => p.id));
      return [...prev, ...rows.filter((p) => !ids.has(p.id))];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPosts.dataUpdatedAt]);

  return (
    <SocialShell>
      <SocialNav title="Profile" />
      {profile.isLoading && <Skeleton className="h-44 w-full" />}
      {profile.isError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          This user could not be found.
        </p>
      )}
      {u && (
        <div className="space-y-4">
          <UserHeader
            user={u}
            stats={{ posts: u.postCount ?? 0, followers: u.followerCount ?? 0, following: u.followingCount ?? 0 }}
            isSelf={Boolean(u.isSelf)}
            onEdit={() => setEditorOpen(true)}
          />
          <h2 className="text-sm font-semibold">Posts</h2>
          {accumulated.length === 0 && !myPosts.isLoading ? (
            <p className="text-sm text-muted-foreground">No posts yet.</p>
          ) : (
            <div className="space-y-3">
              {accumulated.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}
          {(myPosts.data as any)?.pagination?.hasMore && (
            <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={myPosts.isFetching}>
              Load more
            </Button>
          )}
          <EditProfileDialog
            open={editorOpen}
            onOpenChange={setEditorOpen}
            initial={{ photo: u.photo, bio: u.bio, location: u.location, website: u.website }}
          />
        </div>
      )}
    </SocialShell>
  );
}
