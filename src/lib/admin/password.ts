import bcrypt from 'bcryptjs';

/**
 * Password hashing via bcryptjs — the only place passwords are touched.
 * Hashes are stored in admin_users.password_hash; plaintext is never
 * persisted or logged. A constant dummy hash equalizes the timing of
 * lookups for unknown accounts.
 */

const ROUNDS = 12;

/** bcrypt hash of a random string — used to equalize failed-login timing. */
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO7ZBpQz0FtCC3vQyyF4iqunbOCWjCOhi';

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, ROUNDS);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

/** Always runs one bcrypt comparison, even for unknown accounts. */
export async function verifyPasswordEqualized(
  plaintext: string,
  hash: string | null,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash ?? DUMMY_HASH);
}

/** Minimum accepted password length for provisioning and future changes. */
export const MIN_PASSWORD_LENGTH = 12;
