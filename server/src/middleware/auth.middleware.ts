import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { verifyAccessToken } from '../utils/jwt.utils';
import { responses, sendValidationError, sendError } from '../utils/response.utils';
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
 *
 * Fail-closed on the JWT claim, then — only when the claim misses — re-check
 * the live DB row before refusing. That second lookup costs one indexed query
 * and only runs on what would otherwise be a 403, so:
 *  - a stale token (role changed by an admin / a re-registered account while
 *    the 1h access token was still valid) self-heals instead of locking the
 *    user out with "This action requires one of: …";
 *  - genuinely unauthorized accounts still get a 403, with the mismatch
 *    between token claim and DB role written to the warn log.
 */
export function requireRole(...roles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (req.role && roles.includes(req.role)) return next();

      let dbRole: string | null = null;
      if (req.userId) {
        try {
          const claim = req.role ?? 'none';
          const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { role: true },
          });
          dbRole = user?.role ?? null;
          if (dbRole && roles.includes(dbRole)) {
            // Stale-claim heal: continue the request under the live role so a
            // role change mid-session takes effect immediately.
            req.role = dbRole;
            console.warn(`[authz] healed stale claim user=${req.userId} claim=${claim} db=${dbRole}`);
            return next();
          }
        } catch (dbError) {
          console.error('[authz] role fallback lookup failed:', dbError);
        }
      }

      // Which account and claim hit the wall — essential for debugging stale sessions.
      console.warn(`[authz] blocked user=${req.userId ?? 'unknown'} claim=${req.role ?? 'none'} db=${dbRole ?? 'unknown'} needs=${roles.join(',')}`);
      return responses.forbidden(res, `This action requires one of: ${roles.join(', ')}`);
    } catch (error) {
      return next(error);
    }
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
        result.error.issues.forEach((err) => {
          const path = err.path.join('.');
          errors[path] = err.message;
        });
        return sendValidationError(res, errors);
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
      sendError(
        res,
        429,
        'Too many requests',
        `Please try again in ${resetIn} seconds`
      );
    }
  };
}