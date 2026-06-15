/**
 * Module augmentation so `session.user.ownerId` (and the JWT's `ownerId`) are typed.
 * The owner id is the single key server components use to authorize pet access.
 */
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      ownerId: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    ownerId?: string;
  }
}
