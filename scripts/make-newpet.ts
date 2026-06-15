/** Create a persistent fresh pet (no cleanup) to screenshot its empty-state screens.
 *  Delete afterward with scripts/del-pet.ts <id>. Throwaway. */
import { randomUUID } from "node:crypto";
import { createPetFromOnboarding } from "../lib/data/onboarding-write";
import { getDb } from "../lib/db/client";
import { owners } from "../lib/db/schema";

async function main() {
  const db = getDb();
  const [owner] = await db.insert(owners).values({
    email: `screenshot-${randomUUID()}@goldvale.app`, displayName: "Screenshot owner",
  }).returning({ id: owners.id });
  const id = await createPetFromOnboarding({
    name: "Luna", species: "cat", breed: "Domestic shorthair", age: "11 yr", senior: true,
    conditions: ["osteoarthritis"], template: null, onsetDate: "",
    hasPlan: "no", prescriber: "", exercises: [], meds: [{ name: "Meloxicam 0.5 mg", timing: "Morning" }],
  }, owner.id);
  console.log("NEWPET_ID=" + id);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
