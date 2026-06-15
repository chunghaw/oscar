/**
 * Ownership lookups — the relational seam that authorizes pet access. Used by the
 * landing page (route a logged-in owner to their pet) and the /pets/[id] guard
 * (verify the session owner owns the pet before rendering any health surface).
 *
 * Non-clinical: these only answer "does this owner own this pet" / "what's their
 * latest pet". They never read or interpret any health data.
 */
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { pets } from "@/lib/db/schema";

/** True iff the owner owns the pet. False on any miss (used as an auth gate). */
export async function ownerOwnsPet(ownerId: string, petId: string): Promise<boolean> {
  if (!ownerId || !petId) return false;
  const db = getDb();
  const [row] = await db
    .select({ id: pets.id })
    .from(pets)
    .where(and(eq(pets.id, petId), eq(pets.ownerId, ownerId)))
    .limit(1);
  return Boolean(row);
}

/** The owner's most-recently-created pet id, or null if they have none yet. */
export async function mostRecentPetId(ownerId: string): Promise<string | null> {
  if (!ownerId) return null;
  const db = getDb();
  const [row] = await db
    .select({ id: pets.id })
    .from(pets)
    .where(eq(pets.ownerId, ownerId))
    .orderBy(desc(pets.createdAt))
    .limit(1);
  return row?.id ?? null;
}
