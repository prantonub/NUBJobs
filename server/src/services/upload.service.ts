import {
  CLOUDINARY_FOLDERS,
  IMAGE_TRANSFORMATIONS,
  optimizeImageUrl,
  uploadBuffer,
  type StoredFile,
} from '../lib/cloudinary';
import { httpError } from '../utils/http-error.utils';

/** Multer (memory storage) file handle. */
export type UploadedFile = Express.Multer.File;

export interface StoredImage extends StoredFile {
  /** Small, optimised rendition for avatars / cards. Not persisted. */
  thumbnailUrl: string;
}

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function assertMime(file: UploadedFile, allowed: string[], label: string): void {
  if (!file?.buffer?.length) throw httpError(400, 'No file uploaded');
  if (!allowed.includes((file.mimetype || '').toLowerCase())) {
    throw httpError(400, `Unsupported ${label} format (${file.mimetype || 'unknown'})`);
  }
}

function extensionOf(fileName: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(fileName || '');
  return match ? match[1].toLowerCase() : '';
}

/**
 * `nubjobs/<scope>/<ownerId>-<timestamp><random>` — deterministic enough to
 * review in the Cloudinary console, unique enough that two uploads never clash.
 */
function buildPublicId(scope: string, ownerId: string, extension = ''): string {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  const base = `${scope}/${ownerId}-${stamp}${random}`;
  return extension ? `${base}.${extension}` : base;
}

/**
 * POST /api/profile/photo — square 400px face-cropped avatar, `q_auto,f_auto`.
 */
export async function storeProfilePhoto(userId: string, file: UploadedFile): Promise<StoredImage> {
  assertMime(file, IMAGE_MIME_TYPES, 'image');

  const stored = await uploadBuffer(file.buffer, {
    folder: CLOUDINARY_FOLDERS.profilePhotos,
    publicId: buildPublicId('profile-photos', userId),
    resourceType: 'image',
    transformation: IMAGE_TRANSFORMATIONS.profilePhoto,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    tags: ['profile-photo', userId],
  });

  return { ...stored, thumbnailUrl: optimizeImageUrl(stored.url, { width: 96, height: 96, crop: 'fill', gravity: 'face' }) };
}

/**
 * POST /api/profile/resume — PDF/DOC/DOCX stored as a `raw` asset (never
 * transformed, always downloadable with its original extension).
 */
export async function storeResume(userId: string, file: UploadedFile): Promise<StoredFile> {
  assertMime(file, DOCUMENT_MIME_TYPES, 'document');

  const extension = extensionOf(file.originalname) || 'pdf';

  // For raw assets the extension belongs to the public id.
  return uploadBuffer(file.buffer, {
    folder: CLOUDINARY_FOLDERS.resumes,
    publicId: buildPublicId('resumes', userId, extension),
    resourceType: 'raw',
    allowedFormats: ['pdf', 'doc', 'docx'],
    tags: ['resume', userId],
  });
}

/** POST /api/employer/company/logo — 512px fit logo, `q_auto,f_auto`. */
export async function storeCompanyLogo(employerId: string, file: UploadedFile): Promise<StoredImage> {
  assertMime(file, IMAGE_MIME_TYPES, 'image');

  const stored = await uploadBuffer(file.buffer, {
    folder: CLOUDINARY_FOLDERS.companyLogos,
    publicId: buildPublicId('company-logos', employerId),
    resourceType: 'image',
    transformation: IMAGE_TRANSFORMATIONS.companyLogo,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    tags: ['company-logo', employerId],
  });

  return { ...stored, thumbnailUrl: optimizeImageUrl(stored.url, { width: 128, height: 128, crop: 'fit' }) };
}

/** POST /api/company/verification-document — raw document for admin review. */
export async function storeVerificationDocument(
  employerId: string,
  file: UploadedFile
): Promise<StoredFile> {
  assertMime(file, DOCUMENT_MIME_TYPES, 'document');

  const extension = extensionOf(file.originalname) || 'pdf';

  return uploadBuffer(file.buffer, {
    folder: CLOUDINARY_FOLDERS.verificationDocuments,
    publicId: buildPublicId('verification-documents', employerId, extension),
    resourceType: 'raw',
    allowedFormats: ['pdf', 'doc', 'docx'],
    tags: ['verification-document', employerId],
  });
}
