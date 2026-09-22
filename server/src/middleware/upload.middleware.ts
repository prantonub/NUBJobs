import multer, { MulterError } from 'multer';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { responses } from '../utils/response.utils';
import { httpError } from '../utils/http-error.utils';

/** Configurable through server/.env (defaults follow the product spec: 5MB). */
export const MAX_IMAGE_UPLOAD_MB = Number(process.env.MAX_IMAGE_UPLOAD_MB || 5);
export const MAX_DOCUMENT_UPLOAD_MB = Number(process.env.MAX_DOCUMENT_UPLOAD_MB || 5);

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/** Comma separated lists for `<input accept="...">` and API documentation. */
export const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(',');
export const DOCUMENT_ACCEPT = `${DOCUMENT_MIME_TYPES.join(',')},.pdf,.doc,.docx`;

function fileFilter(allowed: string[], label: string) {
  return (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ): void => {
    if (allowed.includes((file.mimetype || '').toLowerCase())) {
      cb(null, true);
      return;
    }
    cb(httpError(400, `Unsupported ${label} format (${file.mimetype || 'unknown'})`));
  };
}

/**
 * Images (profile photo, company logo) — kept in memory so the buffer can be
 * streamed straight to Cloudinary, nothing touches the disk.
 */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_UPLOAD_MB * 1024 * 1024, files: 1, fields: 10 },
  fileFilter: fileFilter(IMAGE_MIME_TYPES, 'image'),
});

/** Documents (resume, verification document) — PDF / DOC / DOCX only. */
export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_UPLOAD_MB * 1024 * 1024, files: 1, fields: 10 },
  fileFilter: fileFilter(DOCUMENT_MIME_TYPES, 'document'),
});

/**
 * Turns Multer failures (size, count, unexpected field, fileFilter errors) into
 * the standard JSON error shape. Must be placed directly after the upload
 * middleware inside the route chain, e.g. `...singleImage('photo')`.
 */
export const handleUploadErrors: ErrorRequestHandler = (err, _req, res, next) => {
  if (!err) {
    next();
    return;
  }

  if (err instanceof MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: `File is too large (max ${MAX_IMAGE_UPLOAD_MB}MB)`,
      LIMIT_FILE_COUNT: 'Only one file can be uploaded at a time',
      LIMIT_FIELD_COUNT: 'Too many form fields in the request',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
    };
    responses.badRequest(res, messages[err.code] ?? `Upload failed: ${err.message}`);
    return;
  }

  next(err);
};

/** `...singleImage('photo')` → multer + error mapping, ready to spread. */
export function singleImage(field: string): RequestHandler[] {
  return [imageUpload.single(field), uploadErrorHandler];
}

/** `...singleDocument('resume')` → multer + error mapping, ready to spread. */
export function singleDocument(field: string): RequestHandler[] {
  return [documentUpload.single(field), uploadErrorHandler];
}

// Express detects error middleware by arity (4 params), which TypeScript cannot
// express inside a RequestHandler[] chain — hence the cast.
const uploadErrorHandler = handleUploadErrors as unknown as RequestHandler;

