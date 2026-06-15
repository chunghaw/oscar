"use server";

/**
 * Auth server actions — sign up, log in, log out. Thin edges over the pure credential
 * rules (lib/domain/credentials) and the bcrypt helpers (lib/auth/passwords). Aurora
 * holds the owner row; next-auth issues the JWT session.
 *
 * Privacy: failures never reveal whether an email exists beyond a single friendly
 * "that email is already registered" on signup. Non-clinical: no health data is touched.
 */
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { getDb } from "@/lib/db/client";
import { owners } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/passwords";
import { normalizeEmail, validateSignup } from "@/lib/domain/credentials";

export interface AuthResult {
  ok: boolean;
  error?: string;
}

export async function signUp(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<AuthResult> {
  const issue = validateSignup(input.email, input.password);
  if (issue) return { ok: false, error: issue.message };

  const email = normalizeEmail(input.email);
  const db = getDb();

  const [existing] = await db
    .select({ id: owners.id })
    .from(owners)
    .where(eq(owners.email, email))
    .limit(1);
  if (existing) {
    return { ok: false, error: "That email is already registered. Try logging in." };
  }

  const passwordHash = await hashPassword(input.password);
  try {
    await db.insert(owners).values({
      email,
      displayName: input.displayName?.trim() || null,
      passwordHash,
    });
  } catch {
    // Unique-violation race (someone registered the same email between check and insert).
    return { ok: false, error: "That email is already registered. Try logging in." };
  }

  // Establish the session immediately so onboarding can attribute the new pet.
  try {
    await signIn("credentials", { email, password: input.password, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: "Account created, but sign-in failed. Please log in." };
    }
    throw err;
  }
  return { ok: true };
}

export async function logIn(input: { email: string; password: string }): Promise<AuthResult> {
  try {
    await signIn("credentials", {
      email: normalizeEmail(input.email),
      password: input.password,
      redirect: false,
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: "Email or password is incorrect." };
    }
    throw err;
  }
}

export async function logOut(): Promise<void> {
  await signOut({ redirect: false });
}
