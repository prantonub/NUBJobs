'use client';

import { PostComposer } from '@/components/social/PostComposer';
import { SocialNav, SocialShell } from '@/components/social/SocialNav';

/** /community/post/new — compose a post (500 chars + 1 photo). */
export default function NewPostPage() {
  return (
    <SocialShell>
      <SocialNav title="New post" subtitle="Share tips, wins or questions with your network." />
      <PostComposer />
    </SocialShell>
  );
}
