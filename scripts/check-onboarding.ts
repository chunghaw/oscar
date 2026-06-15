/** Verify the onboarding write creates a full linked pet record, then clean up. Throwaway. */
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { createPetFromOnboarding } from "../lib/data/onboarding-write";
import { getDb } from "../lib/db/client";
import { owners, pets, exercisePlans, planItems, protocolInstances, medicationEvents } from "../lib/db/schema";

async function main() {
  const db = getDb();
  const [owner] = await db.insert(owners).values({
    email: `onboarding-check-${randomUUID()}@goldvale.app`, displayName: "Onboarding check owner",
  }).returning({ id: owners.id });
  const petId = await createPetFromOnboarding({
    name: "Test Pet", species: "dog", breed: "Beagle", age: "9 yr", senior: true,
    conditions: ["post_op", "osteoarthritis"], template: "tplo_post_op", onsetDate: "2 May 2026",
    hasPlan: "yes", prescriber: "Dr. Test", exercises: ["sit_to_stand", "weight_shift"],
    meds: [{ name: "Carprofen 75 mg", timing: "Morning" }],
  }, owner.id);

  const [pet] = await db.select().from(pets).where(eq(pets.id, petId));
  const plans = await db.select().from(exercisePlans).where(eq(exercisePlans.petId, petId));
  const items = plans.length ? await db.select().from(planItems).where(eq(planItems.planId, plans[0].id)) : [];
  const protos = await db.select().from(protocolInstances).where(eq(protocolInstances.petId, petId));
  const meds = await db.select().from(medicationEvents).where(eq(medicationEvents.petId, petId));

  console.log("pet      :", pet.name, "·", pet.species, "· dob", pet.dateOfBirth, "· senior", pet.isSenior, "· conditions", JSON.stringify(pet.chronicConditions));
  console.log("protocol :", protos.map((p) => `${p.templateId}@${p.onsetDate}`).join(", "));
  console.log("plan     :", plans[0]?.prescriberName, "·", items.map((i) => `${i.exerciseId}(${i.targetSets}x${i.targetReps})`).join(", "));
  console.log("meds     :", meds.map((m) => `${m.medName}/${m.given}`).join(", "));

  await db.delete(owners).where(eq(owners.id, pet.ownerId)); // cascades pet + children
  const after = await db.select().from(pets).where(eq(pets.id, petId));
  console.log(after.length === 0 ? "\n✓ Onboarding write OK (and cleaned up)" : "\n✗ cleanup failed");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
