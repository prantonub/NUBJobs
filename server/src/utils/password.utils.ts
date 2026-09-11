import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate OTP (6 digits)
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Check if OTP is valid and not expired
 */
export function isOTPValid(storedOTP: string, providedOTP: string, expiryTime: Date): boolean {
  if (storedOTP !== providedOTP) return false;
  if (new Date() > expiryTime) return false;
  return true;
}

/**
 * Get OTP expiry time (10 minutes from now)
 */
export function getOTPExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10);
  return expiry;
}