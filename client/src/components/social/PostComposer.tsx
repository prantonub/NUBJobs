'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreatePost } from '@/hooks/useSocial';
import api from '@/lib/axios';
import { BarChart3, ImagePlus, Loader2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

/** Inline quick composer for the feed ("What's on your mind?" entry). */
export function PostComposerTeaser() {
  return (
    <a
      href="/social/post/new"
      className="block rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground transition-colors hover:bg-muted/60"
    >
      Share your thoughts, tips or wins…
    </a>
  );
}

/** Full compose form with counter + photo upload (spec /post/new page). */
export function PostComposer({ initial }: { initial?: { content: string; photoUrl?: string | null } }) {
  const router = useRouter();
  const create = useCreatePost();
  const [content, setContent] = useState(initial?.content ?? '');
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? '');
  const [preview, setPreview] = useState<string | null>(initial?.photoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Poll builder (Twitter-style: question + 2–4 options).
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const remaining = 500 - content.length;
  const pollActive = showPoll && (pollQuestion.trim() || pollOptions.some((o) => o.trim()));
  const cleanOptions = pollActive ? pollOptions.map((o) => o.trim()).filter(Boolean) : [];
  const pollValid = showPoll && pollQuestion.trim() && cleanOptions.length >= 2;
  const pollError =
    pollActive && cleanOptions.length < 2
      ? 'Add a question + at least 2 poll options'
      : null;
  // Text is optional when a valid poll (or photo) carries the post.
  const invalid =
    uploading ||
    content.length > 500 ||
    Boolean(pollError) ||
    (!content.trim() && !photoUrl.trim() && !pollValid);

  const pickPhoto = () => fileRef.current?.click();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG or WEBP photos are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be 5MB or smaller');
      return;
    }
    // Instant local preview while the file uploads in the background.
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('photo', file, file.name);
      const { data } = await api.post('/social/posts/photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url: string | undefined = data?.data?.photoUrl;
      if (!url) throw new Error('Upload returned no URL');
      URL.revokeObjectURL(localUrl);
      setPhotoUrl(url);
      setPreview(url);
    } catch (err: any) {
      URL.revokeObjectURL(localUrl);
      setPreview(photoUrl || null);
      toast.error(err?.response?.data?.message ?? 'Photo upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = () => {
    setPhotoUrl('');
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const setOption = (i: number, v: string) =>
    setPollOptions((prev) => prev.map((o, j) => (j === i ? v : o)));
  const addOption = () => setPollOptions((prev) => (prev.length >= 4 ? prev : [...prev, '']));
  const removeOption = (i: number) =>
    setPollOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, j) => j !== i)));
  const clearPoll = () => {
    setShowPoll(false);
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  return (
    <form
      className="space-y-4 rounded-lg border border-border bg-card p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (invalid || create.isPending) return;
        try {
          await create.mutateAsync({
            content: content.trim(),
            photoUrl: photoUrl.trim() || null,
            ...(pollValid
              ? { pollQuestion: pollQuestion.trim(), pollOptions: cleanOptions }
              : {}),
          });
          toast.success('Posted');
          router.push('/social');
        } catch (err: any) {
          toast.error(err?.response?.data?.message ?? 'Failed to post');
        }
      }}
    >
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={showPoll ? 2 : 5}
        maxLength={600}
        placeholder={showPoll ? 'Add a caption (optional)…' : "What's on your mind? Use #hashtags and @mentions…"}
        aria-label="Post content"
      />
      {/* Photo picker — uploads to Cloudinary, stores the URL for the post */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-label="Upload a photo"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Post photo preview" className="max-h-80 w-full rounded-lg object-contain bg-muted/30" />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
              <Loader2 className="size-6 animate-spin text-white" />
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-2 top-2 size-7 rounded-full"
            onClick={removePhoto}
            aria-label="Remove photo"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={pickPhoto} disabled={uploading}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            Add photo
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowPoll(true)} disabled={showPoll}>
            <BarChart3 className="size-4" />
            Add poll
          </Button>
        </div>
      )}
      {/* Poll builder — question + 2–4 options, Twitter-style */}
      {showPoll && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Poll</p>
            <Button type="button" variant="ghost" size="sm" onClick={clearPoll}>
              <X className="size-4" /> Remove
            </Button>
          </div>
          <Input
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            placeholder="Ask a question… (max 140 chars)"
            maxLength={140}
            aria-label="Poll question"
          />
          {pollOptions.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1} (max 60 chars)`}
                maxLength={60}
                aria-label={`Poll option ${i + 1}`}
              />
              {pollOptions.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(i)}
                  aria-label={`Remove option ${i + 1}`}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          ))}
          {pollOptions.length < 4 && (
            <Button type="button" variant="ghost" size="sm" onClick={addOption}>
              + Add option
            </Button>
          )}
          {pollError && <p className="text-xs text-destructive">{pollError}</p>}
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className={`text-xs ${remaining < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {content.length}/500
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={invalid || create.isPending}>
            {create.isPending ? 'Posting…' : 'Post'}
          </Button>
        </div>
      </div>
    </form>
  );
}
