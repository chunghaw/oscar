/**
 * Credential validation — PURE, unit-tested, no I/O. The signup/login server actions
 * lean on these so the rules (email shape, password length, normalisation) are tested
 * once and shared. Nothing here is clinical; it only governs account hygiene.
 */

export const MIN_PASSWORD_LENGTH = 8;

// Pragmatic email shape check — not RFC-exhaustive, just "looks like an address".
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lowercase + trim — the canonical key we store and look up owners by. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmail(email));
}

export interface CredentialIssue {
  field: "email" | "password";
  message: string;
}

/**
 * Validate a sign-up credential pair. Returns the first issue, or null if clean.
 * The friendly messages are safe to show inline.
 */
export function validateSignup(email: string, password: string): CredentialIssue | null {
  if (!isValidEmail(email)) {
    return { field: "email", message: "Please enter a valid email address." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { field: "password", message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  return null;
}
