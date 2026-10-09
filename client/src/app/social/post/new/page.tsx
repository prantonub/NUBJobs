'use client';

import { PostComposer } from '@/components/social/PostComposer';
import { SocialNav, SocialShell } from '@/components/social/SocialNav';

/** /social/post/new — compose a post. */
export default function NewPostPage() {
  return (
    <SocialShell>
      <SocialNav title="New post" subtitle="Share your thoughts with the network." />
      <PostComposer />
    </SocialShell>
  );
}
