/**
 * Auth.js (next-auth v5) — email + password accounts, JWT session (no DB session
 * table). The Credentials provider looks an owner up by lowercased email, requires a
 * stored bcrypt hash, and verifies the password. The owner's id is carried on the JWT
 * and surfaced as `session.user.ownerId` so server components can authorize cheaply.
 *
 * Non-clinical / data note: auth touches only the relational `owners` row. It never
 * sees pet health data and makes no judgement — it just answers "who is this owner".
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { owners } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/passwords";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const email = typeof raw?.email === "string" ? raw.email.trim().toLowerCase() : "";
        const password = typeof raw?.password === "string" ? raw.password : "";
        if (!email || !password) return null;

        const db = getDb();
        const [owner] = await db
          .select({ id: owners.id, email: owners.email, displayName: owners.displayName, passwordHash: owners.passwordHash })
          .from(owners)
          .where(eq(owners.email, email))
          .limit(1);

        if (!owner?.passwordHash) return null;
        const ok = await verifyPassword(password, owner.passwordHash);
        if (!ok) return null;

        return { id: owner.id, email: owner.email, name: owner.displayName ?? null };
      },
    }),
  ],
  callbacks: {
    // Persist the owner id on the JWT at sign-in.
    jwt({ token, user }) {
      if (user?.id) token.ownerId = user.id;
      return token;
    },
    // Expose the owner id on the session for server-side authorization.
    session({ session, token }) {
      if (token.ownerId && session.user) {
        session.user.ownerId = token.ownerId as string;
      }
      return session;
    },
  },
});
