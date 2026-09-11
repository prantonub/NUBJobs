import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import { responses } from '../utils/response.utils';
import { ZodSchema } from 'zod';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
}

/**
 * Authenticate middleware - Verify JWT token
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return responses.unauthorized(res, 'Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    if (!payload) {
      return responses.unauthorized(res, 'Invalid or expired token');
    }

    req.userId = payload.userId;
    req.email = payload.email;
    req.role = payload.role;

    next();
  } catch (error) {
    responses.internalError(res);
  }
}

/**
 * Optional auth middleware - Don't fail if no token
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = verifyAccessToken(token);
      if (payload) {
        req.userId = payload.userId;
        req.email = payload.email;
        req.role = payload.role;
      }
    }
    next();
  } catch (error) {
    next();
  }
}

/**
 * Require specific role
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.role || !roles.includes(req.role)) {
      return responses.forbidden(res, `This action requires one of: ${roles.join(', ')}`);
    }
    next();
  };
}

/**
 * Validate request body/params/query with Zod
 */
export function validate(schema: ZodSchema) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          const path = err.path.join('.');
          errors[path] = err.message;
        });
        return responses.sendValidationError(res, errors);
      }
      req.body = result.data;
      next();
    } catch (error) {
      responses.badRequest(res, 'Invalid request');
    }
  };
}

/**
 * Rate limiting middleware
 * Limit: 5 requests per 15 minutes per IP
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests: number = 5, windowMs: number = 15 * 60 * 1000) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();

    const record = requestCounts.get(ip);

    if (!record || now > record.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      next();
    } else if (record.count < maxRequests) {
      record.count++;
      next();
    } else {
      const resetIn = Math.ceil((record.resetTime - now) / 1000);
      res.set('Retry-After', String(resetIn));
      responses.sendError(
        res,
        429,
        'Too many requests',
        `Please try again in ${resetIn} seconds`
      );
    }
  };
}