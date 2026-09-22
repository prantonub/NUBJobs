'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { AxiosProgressEvent } from 'axios';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { getErrorMessage } from '@/lib/utils';

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
export const DEFAULT_MAX_UPLOAD_MB = 5;

export interface FileUploadRules {
  /** Accepted MIME types. `image/*` style wildcards are supported. */
  accept?: string[];
  /**
   * Accepted file extensions (`pdf`, `docx`, ...) — fallback for browsers that
   * report an empty MIME type (common with Office documents).
   */
  extensions?: string[];
  maxSizeMb?: number;
}

/**
 * Client-side guard rail mirroring the Multer/Cloudinary limits on the server.
 * Returns an error message, or `null` when the file is acceptable.
 */
export function validateUploadFile(file: File, rules: FileUploadRules = {}): string | null {
  const maxSizeMb = rules.maxSizeMb ?? DEFAULT_MAX_UPLOAD_MB;
  if (!file || file.size === 0) return 'The selected file is empty';
  if (file.size > maxSizeMb * 1024 * 1024) return `File must be ${maxSizeMb}MB or smaller`;

  const accept = rules.accept ?? [];
  const extensions = rules.extensions ?? [];
  if (accept.length === 0 && extensions.length === 0) return null;

  const mime = (file.type || '').toLowerCase();
  const name = file.name.toLowerCase();
  const mimeAllowed = accept.some((allowed) =>
    allowed.endsWith('/*') ? mime.startsWith(allowed.slice(0, -1)) : mime === allowed.toLowerCase()
  );
  const extensionAllowed = extensions.some((extension) => name.endsWith(`.${extension.toLowerCase()}`));

  if (!mimeAllowed && !extensionAllowed) {
    const allowedList = [...accept, ...extensions.map((extension) => `.${extension}`)];
    return `Unsupported file type. Allowed: ${allowedList.join(', ')}`;
  }

  return null;
}

export interface UseFileUploadOptions extends FileUploadRules {
  /** API path without the `/api` prefix — e.g. `/profile/photo`. */
  endpoint: string;
  /** Multer field name — e.g. `photo`, `resume`, `logo`. */
  fieldName: string;
  /** React Query keys invalidated after a successful upload. */
  invalidateKeys?: QueryKey[];
  successMessage?: string;
  errorMessage?: string;
  onUploaded?: (data: unknown) => void;
}

export interface UploadDragHandlers {
  onDragEnter: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
}

/**
 * Reusable multipart upload hook: validation, progress, React Query cache
 * invalidation, error surfacing and drag & drop state.
 *
 * @example
 * const { upload, progress, dragHandlers, isUploading } = useFileUpload({
 *   endpoint: '/profile/photo',
 *   fieldName: 'photo',
 *   accept: IMAGE_MIME_TYPES,
 *   invalidateKeys: [['profile']],
 * });
 */
export function useFileUpload(options: UseFileUploadOptions) {
  const {
    endpoint,
    fieldName,
    accept,
    extensions,
    maxSizeMb,
    invalidateKeys,
    successMessage,
    errorMessage,
    onUploaded,
  } = options;

  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Counter (not a boolean) so entering a nested element doesn't clear the state.
  const dragDepth = useRef(0);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append(fieldName, file, file.name);
      const { data } = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event: AxiosProgressEvent) => {
          if (!event.total) return;
          setProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        },
      });
      return data;
    },
    onSuccess: (data) => {
      setProgress(100);
      invalidateKeys?.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      onUploaded?.(data);
      toast.success(successMessage ?? 'Upload complete');
    },
    onError: (uploadError) => {
      const message = getErrorMessage(uploadError, errorMessage ?? 'Upload failed. Please try again.');
      setError(message);
      toast.error(message);
    },
  });

  const { mutateAsync, isPending } = mutation;

  const upload = useCallback(
    async (file: File): Promise<unknown | null> => {
      const validationError = validateUploadFile(file, { accept, extensions, maxSizeMb });
      if (validationError) {
        setError(validationError);
        toast.error(validationError);
        return null;
      }

      setError(null);
      setProgress(0);

      try {
        return await mutateAsync(file);
      } catch {
        // Already reported through onError.
        return null;
      }
    },
    [accept, extensions, maxSizeMb, mutateAsync]
  );

  const reset = useCallback(() => {
    setError(null);
    setProgress(0);
  }, []);

  const dragHandlers = useMemo<UploadDragHandlers>(
    () => ({
      onDragEnter: (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (isPending) return;
        dragDepth.current += 1;
        setIsDragging(true);
      },
      onDragOver: (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isPending) event.dataTransfer.dropEffect = 'copy';
      },
      onDragLeave: (event) => {
        event.preventDefault();
        event.stopPropagation();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setIsDragging(false);
      },
      onDrop: (event) => {
        event.preventDefault();
        event.stopPropagation();
        dragDepth.current = 0;
        setIsDragging(false);
        if (isPending) return;

        const file = event.dataTransfer.files?.[0];
        if (file) void upload(file);
      },
    }),
    [isPending, upload]
  );

  /** Value for `<input accept="...">`. */
  const acceptAttribute = useMemo(
    () => [...(accept ?? []), ...(extensions ?? []).map((extension) => `.${extension}`)].join(','),
    [accept, extensions]
  );

  return {
    upload,
    progress,
    error,
    isDragging,
    isUploading: isPending,
    dragHandlers,
    acceptAttribute,
    maxSizeMb: maxSizeMb ?? DEFAULT_MAX_UPLOAD_MB,
    reset,
  };
}

