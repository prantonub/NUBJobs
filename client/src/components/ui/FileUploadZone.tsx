'use client';

import * as React from 'react';
import { ImageUp, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useFileUpload, type UseFileUploadOptions } from '@/hooks/useFileUpload';

export interface FileUploadZoneProps extends Omit<UseFileUploadOptions, 'onUploaded'> {
  /** Headline shown inside the drop zone. */
  label?: string;
  /** Secondary line — defaults to "… drag & drop or browse · max XMB". */
  hint?: string;
  /** Already stored file (Cloudinary `secure_url`) rendered as a preview. */
  previewUrl?: string | null;
  previewShape?: 'circle' | 'square';
  previewAlt?: string;
  /** Caption next to the preview, defaults to "Current file". */
  previewLabel?: string;
  disabled?: boolean;
  className?: string;
  onUploaded?: (data: unknown) => void;
}

/**
 * Drag & drop + click-to-browse upload zone.
 *
 * Handles the whole flow on its own: validation, `POST` as
 * `multipart/form-data`, progress bar, toasts and React Query invalidation.
 *
 * @example
 * <FileUploadZone
 *   endpoint="/profile/photo"
 *   fieldName="photo"
 *   accept={IMAGE_MIME_TYPES}
 *   invalidateKeys={[['profile']]}
 *   previewUrl={profile?.photoUrl}
 *   previewShape="circle"
 * />
 */
export function FileUploadZone({
  label,
  hint,
  previewUrl,
  previewShape = 'square',
  previewAlt = 'Uploaded file',
  previewLabel = 'Current file',
  disabled = false,
  className,
  onUploaded,
  ...uploadOptions
}: FileUploadZoneProps) {
  const { upload, progress, error, isDragging, isUploading, dragHandlers, acceptAttribute, maxSizeMb } =
    useFileUpload({ ...uploadOptions, onUploaded });

  const inputRef = React.useRef<HTMLInputElement>(null);
  const isBlocked = disabled || isUploading;

  const openPicker = React.useCallback(() => {
    if (isBlocked) return;
    // Clear first so picking the same file again still fires `change`.
    if (inputRef.current) inputRef.current.value = '';
    inputRef.current?.click();
  }, [isBlocked]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void upload(file);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPicker();
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div
        role="button"
        tabIndex={isBlocked ? -1 : 0}
        aria-disabled={isBlocked}
        aria-label={label ?? 'Upload a file'}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        {...dragHandlers}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-6 py-6 text-center transition-colors outline-none',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/60 hover:bg-muted/40',
          isBlocked && 'pointer-events-none opacity-60'
        )}
      >
        {isUploading ? (
          <Loader2 className="size-6 animate-spin text-primary" />
        ) : isDragging ? (
          <Upload className="size-6 text-primary" />
        ) : (
          <ImageUp className="size-6 text-muted-foreground" />
        )}

        <p className="text-sm font-medium">
          {isUploading ? `Uploading… ${progress}%` : isDragging ? 'Drop the file to upload' : label ?? 'Upload a file'}
        </p>
        <p className="text-xs text-muted-foreground">
          {hint ?? `Drag & drop or click to browse · max ${maxSizeMb}MB`}
        </p>

        {isUploading && <Progress value={progress} className="mt-1 h-1.5 w-full max-w-xs" />}
      </div>
      {/* Preview + manual picker */}
      <div className="flex items-center gap-3">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={previewAlt}
            className={cn(
              'size-16 shrink-0 object-cover',
              previewShape === 'circle' ? 'rounded-full' : 'rounded-lg border'
            )}
          />
        ) : null}

        <div className="flex flex-col items-start gap-1">
          {previewUrl ? <span className="text-xs text-muted-foreground">{previewLabel}</span> : null}
          <Button type="button" variant="outline" size="sm" onClick={openPicker} disabled={isBlocked}>
            {isUploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            {previewUrl ? 'Replace file' : 'Choose file'}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <input
        ref={inputRef}
        type="file"
        accept={acceptAttribute || undefined}
        className="hidden"
        onChange={handleInputChange}
        disabled={isBlocked}
      />

    </div>
  );
}
