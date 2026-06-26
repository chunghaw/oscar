/**
 * Phase-1 verification for overnight #1 — live clock for real pets.
 *
 * Creates a NEW owner + non-demo pet on live Aurora, prints the PetView's
 * dateLabel + nextVisit / ageYears math, then deletes the owner (cascades).
 * Also reads the seeded demo pet for comparison so we can see frozen vs live
 * side by side. Cleans up the throwaway pet — leaves the demo untouched.
 *
 *   npx tsx --env-file=.env scripts/verify-live-clock.ts
 */
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { createPetFromOnboarding } from "../lib/data/onboarding-write";
import { getPetViewFromDb } from "../lib/data/queries";
import { clockFor, DEMO_NOW } from "../lib/data/pets";
import { getDb } from "../lib/db/client";
import { owners, pets } from "../lib/db/schema";
import { OSCAR_PET_ID } from "../lib/data/ids";

async function main() {
  const db = getDb();
  const realNow = new Date();
  console.log("Wall clock now (UTC):", realNow.toISOString());
  console.log("Frozen DEMO_NOW:     ", DEMO_NOW.toISOString());

  // 1) New owner + non-demo pet
  const [owner] = await db.insert(owners).values({
    email: `verify-${randomUUID()}@goldvale.app`,
    displayName: "Verify owner",
  }).returning({ id: owners.id });

  const petId = await createPetFromOnboarding({
    name: "Verifier", species: "dog", breed: "Lab mix", age: "10 yr", senior: true,
    conditions: ["osteoarthritis"], template: null, onsetDate: "",
    hasPlan: "no", prescriber: "", exercises: [], meds: [],
  }, owner.id);

  console.log("\n── NON-DEMO PET (should use REAL clock) ─────────────────");
  console.log("petId:", petId);
  const live = await getPetViewFromDb(petId, clockFor(petId));
  if (!live) throw new Error("non-demo view null");
  console.log("dateLabel (checkin):", live.checkin.dateLabel);
  console.log("nextVisit:          ", live.header.nextVisit);
  console.log("clockFor(non-demo):", clockFor(petId).toISOString());

  // 2) Seeded demo pet — should still be frozen
  console.log("\n── DEMO PET (should stay frozen at 2026-06-09) ──────────");
  const demo = await getPetViewFromDb(OSCAR_PET_ID, clockFor(OSCAR_PET_ID));
  if (!demo) throw new Error("demo view null — has it been seeded?");
  console.log("dateLabel (checkin):", demo.checkin.dateLabel);
  console.log("nextVisit:          ", demo.header.nextVisit);
  console.log("clockFor(demo):    ", clockFor(OSCAR_PET_ID).toISOString());

  // 3) Assertions
  const frozenLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(DEMO_NOW);
  const liveLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(realNow);

  console.log("\n── Assertions ───────────────────────────────────────────");
  console.log("expected frozen label:", frozenLabel);
  console.log("expected live label:  ", liveLabel);
  const demoOk = demo.checkin.dateLabel === frozenLabel;
  const liveOk = live.checkin.dateLabel === liveLabel;
  console.log("demo dateLabel == frozen?", demoOk);
  console.log("live dateLabel == live now?", liveOk);

  // 4) Cleanup the throwaway owner (cascades to pet + history)
  const [petRow] = await db.select().from(pets).where(eq(pets.id, petId)).limit(1);
  await db.delete(owners).where(eq(owners.id, petRow.ownerId));
  console.log("\n✓ cleaned up throwaway owner/pet");

  if (!demoOk || !liveOk) {
    console.error("\n✗ FAIL — clock threading is wrong");
    process.exit(1);
  }
  console.log("\n✓ PASS — live clock for real pets, frozen clock for demo");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
