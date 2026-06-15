/**
 * Password hashing — bcryptjs (pure JS, Vercel-safe, no native bindings).
 *
 * Non-secret note: this is the only place plaintext passwords are touched. Hashes
 * are stored on owners.password_hash; the plaintext is never persisted or logged.
 */
import bcrypt from "bcryptjs";

const COST = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
