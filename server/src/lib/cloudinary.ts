import { config as loadEnv } from 'dotenv';
import {
  v2 as cloudinary,
  type UploadApiErrorResponse,
  type UploadApiOptions,
  type UploadApiResponse,
} from 'cloudinary';
import { httpError, type HttpError } from '../utils/http-error.utils';

// Guarantee CLOUDINARY_* from server/.env is available even when this module is
// imported before the entrypoint had a chance to run dotenv itself.
loadEnv();

export type StoredResourceType = 'image' | 'video' | 'raw';
export type UploadResourceType = StoredResourceType | 'auto';

/** Root folders inside the Cloudinary account, one per upload domain. */
export const CLOUDINARY_FOLDERS = {
  profilePhotos: 'nubjobs/profile-photos',
  resumes: 'nubjobs/resumes',
  companyLogos: 'nubjobs/company-logos',
  verificationDocuments: 'nubjobs/verification-documents',
  smokeTests: 'nubjobs/tests',
} as const;

/**
 * Delivery transformations baked into the stored URL, so Cloudinary
 * resizes/re-encodes (`q_auto,f_auto`) every request on the fly.
 */
export const IMAGE_TRANSFORMATIONS: Record<string, UploadApiOptions['transformation']> = {
  // Square avatar cropped around the detected face.
  profilePhoto: {
    width: 400,
    height: 400,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
    fetch_format: 'auto',
  },
  // Logo keeps its aspect ratio inside a 512px box.
  companyLogo: {
    width: 512,
    height: 512,
    crop: 'fit',
    quality: 'auto',
    fetch_format: 'auto',
  },
};

export interface StoredFile {
  /** Secure delivery URL (already optimised). Persist this in Postgres. */
  url: string;
  publicId: string;
  resourceType: StoredResourceType;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
}

export interface UploadBufferOptions {
  folder: string;
  /** Without extension for image/video, **with** extension for raw assets. */
  publicId?: string;
  resourceType?: UploadResourceType;
  transformation?: UploadApiOptions['transformation'];
  format?: string;
  allowedFormats?: string[];
  tags?: string[];
}

interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  connectionString: string;
}

function readCredentials(): CloudinaryCredentials {
  return {
    // Use the exact cloud name shown in the Cloudinary dashboard →
    // "Product Environment" → cloud name.
    cloudName: (process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME || '').trim(),
    apiKey: (process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_KEY || '').trim(),
    apiSecret: (process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET || '').trim(),
    connectionString: (process.env.CLOUDINARY_URL || '').trim(),
  };
}

let configuredFor: string | null = null;

/** True when the three credentials (or a CLOUDINARY_URL) are present. */
export function isCloudinaryConfigured(): boolean {
  const { cloudName, apiKey, apiSecret, connectionString } = readCredentials();
  return Boolean(connectionString) || Boolean(cloudName && apiKey && apiSecret);
}

/** Cloud name currently in use, or `null` when unconfigured. */
export function getCloudinaryCloudName(): string | null {
  const { cloudName, connectionString } = readCredentials();
  if (cloudName) return cloudName;
  if (connectionString.includes('@')) return connectionString.split('@').pop() || null;
  return null;
}

/** Masked API key (first 4 chars) — handy when debugging credentials. */
export function getCloudinaryApiKeyPreview(): string {
  const { apiKey, connectionString } = readCredentials();
  const key = apiKey || (connectionString.split('://')[1]?.split(':')[0] ?? '');
  if (!key) return '(not set)';
  return `${key.slice(0, 4)}${'*'.repeat(Math.max(key.length - 4, 0))}`;
}

/** Apply credentials to the SDK (idempotent + lazy so it works in tests). */
export function ensureCloudinaryConfig(): void {
  const credentials = readCredentials();
  const cacheKey = credentials.connectionString || `${credentials.cloudName}|${credentials.apiKey}`;
  if (configuredFor === cacheKey) return;

  if (credentials.connectionString) {
    // The SDK parses CLOUDINARY_URL itself when it is present in the env.
    cloudinary.config({ secure: true });
  } else if (credentials.cloudName && credentials.apiKey && credentials.apiSecret) {
    cloudinary.config({
      cloud_name: credentials.cloudName,
      api_key: credentials.apiKey,
      api_secret: credentials.apiSecret,
      secure: true,
    });
  } else {
    throw httpError(
      500,
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET (or CLOUDINARY_URL) in server/.env'
    );
  }

  configuredFor = cacheKey;
}

/**
 * Upload a Buffer (Multer memory storage) to Cloudinary.
 * Resolves with the stored asset metadata, rejects with an HTTP-aware error.
 */
export function uploadBuffer(buffer: Buffer, options: UploadBufferOptions): Promise<StoredFile> {
  if (!buffer || buffer.length === 0) {
    return Promise.reject(httpError(400, 'Cannot upload an empty file'));
  }

  ensureCloudinaryConfig();

  const apiOptions: UploadApiOptions = {
    folder: options.folder,
    resource_type: options.resourceType ?? 'auto',
    overwrite: true,
    invalidate: true,
    use_filename: false,
    unique_filename: false,
    ...(options.publicId ? { public_id: options.publicId } : {}),
    ...(options.format ? { format: options.format } : {}),
    ...(options.transformation ? { transformation: [options.transformation] } : {}),
    ...(options.allowedFormats?.length
      ? { allowed_formats: options.allowedFormats as UploadApiOptions['allowed_formats'] }
      : {}),
    ...(options.tags?.length ? { tags: options.tags } : {}),
  };

  return new Promise<StoredFile>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(apiOptions, (error, result) => {
      if (error) {
        reject(toUploadError(error));
        return;
      }
      if (!result) {
        reject(httpError(502, 'Cloudinary did not return an upload result'));
        return;
      }
      resolve(toStoredFile(result));
    });

    stream.end(buffer);
  });
}

/** Permanently delete an asset by public id + resource type. */
export async function destroyFile(
  publicId: string,
  resourceType: StoredResourceType = 'image'
): Promise<boolean> {
  if (!publicId || !isCloudinaryConfigured()) return false;

  ensureCloudinaryConfig();

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });

  // "not found" is a success for our use case: the asset is already gone.
  return result?.result === 'ok' || result?.result === 'not found';
}

/**
 * Parse a Cloudinary delivery URL back into `{ publicId, resourceType }` so a
 * stored URL alone is enough to delete the asset later.
 * Returns `null` for anything that is not a Cloudinary URL (data: URIs,
 * legacy `/uploads/...` paths, remote images, ...).
 */
export function parseCloudinaryUrl(url: string | null | undefined): {
  publicId: string;
  resourceType: StoredResourceType;
} | null {
  if (!url || !url.includes('res.cloudinary.com')) return null;

  const match = /res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/(?:upload|private|authenticated)\/(.+)$/.exec(
    url.split('?')[0]
  );
  if (!match) return null;

  const resourceType = match[1] as StoredResourceType;
  const segments = match[2].split('/').filter(Boolean);

  // Prefer the version marker (`/v1712345678/`); everything after it is the
  // public id. When no version is present, drop leading transformation
  // segments (`w_400,h_400,c_fill`, `q_auto`, ...).
  const versionIndex = segments.reduce(
    (found, segment, index) => (/^v\d+$/.test(segment) ? index : found),
    -1
  );
  if (versionIndex >= 0) segments.splice(0, versionIndex + 1);
  else while (segments.length > 1 && /^[a-z]{1,4}_[^/]*$/i.test(segments[0])) segments.shift();

  let publicId = segments.join('/');
  if (!publicId) return null;

  // Raw assets keep their extension inside the public id; images do not.
  if (resourceType !== 'raw') publicId = publicId.replace(/\.[a-z0-9]+$/i, '');
  if (!publicId) return null;

  return { publicId: decodeURIComponent(publicId), resourceType };
}

/**
 * Delete a previously stored file. Safe to call with `null`, data URIs or
 * legacy local paths — those are simply ignored.
 */
export async function removeStoredFile(fileUrl: string | null | undefined): Promise<boolean> {
  const parsed = parseCloudinaryUrl(fileUrl);
  if (!parsed) return false;

  try {
    return await destroyFile(parsed.publicId, parsed.resourceType);
  } catch (error) {
    // Never let cleanup failure break the request that produced the new file.
    console.warn(`[cloudinary] could not delete ${parsed.publicId}:`, error);
    return false;
  }
}

export interface OptimizeImageOptions {
  width?: number;
  height?: number;
  crop?: string;
  gravity?: string;
  quality?: string | number;
  format?: string;
}

/**
 * Build an optimised delivery URL for an existing Cloudinary image, e.g. a
 * 96px avatar thumbnail from the stored 400px photo. Non-Cloudinary URLs are
 * returned untouched.
 *
 * @example optimizeImageUrl(photoUrl, { width: 96, height: 96, crop: 'fill' })
 */
export function optimizeImageUrl(url: string | null | undefined, options: OptimizeImageOptions = {}): string {
  if (!url) return '';

  const parts: string[] = [];
  if (options.width) parts.push(`w_${options.width}`);
  if (options.height) parts.push(`h_${options.height}`);
  if (options.crop) parts.push(`c_${options.crop}`);
  if (options.gravity) parts.push(`g_${options.gravity}`);
  if (options.quality) parts.push(`q_${options.quality}`);
  if (options.format) parts.push(`f_${options.format}`);
  if (parts.length === 0) return url;

  const marker = '/image/upload/';
  if (!url.includes(marker)) return url;

  return url.replace(marker, `${marker}${parts.join(',')}/`);
}

function toUploadError(error: UploadApiErrorResponse): HttpError {
  const status =
    typeof error.http_code === 'number' && error.http_code >= 400 && error.http_code < 600
      ? error.http_code
      : 502;
  const detail = (error.message || '').trim() || 'request rejected by Cloudinary';

  // Cloudinary answers 403 with `missing permissions (actions=["create"])` when
  // the API key's role cannot create assets — a dashboard-side misconfiguration
  // that is otherwise very hard to read from the SDK error.
  if (status === 403) {
    return httpError(
      status,
      `Cloudinary rejected the upload (403): ${detail}. The API key (${getCloudinaryApiKeyPreview()}) most likely lacks upload ("create") permission — give the key a role with upload rights in the Cloudinary console (Settings → API keys) or create a new key and update CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET in server/.env`
    );
  }

  return httpError(status, `Cloudinary upload failed: ${detail}`);
}

function toStoredFile(result: UploadApiResponse): StoredFile {
  return {
    url: result.secure_url || result.url,
    publicId: result.public_id,
    resourceType:
      result.resource_type === 'video' ? 'video' : result.resource_type === 'image' ? 'image' : 'raw',
    format: result.format || '',
    bytes: result.bytes || 0,
    width: typeof result.width === 'number' ? result.width : null,
    height: typeof result.height === 'number' ? result.height : null,
  };
}



