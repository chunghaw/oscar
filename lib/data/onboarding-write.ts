/**
 * Onboarding persistence — creates a full pet record from the setup flow across the
 * relational layer: owner → pet → (optional) protocol instance, vet plan + items,
 * and medication registrations. Pure DB write (testable; no "use server").
 *
 * Non-clinical: this CAPTURES what the owner/vet provide. Conditions are stored as
 * memory tags, the template is a milestone store, and the plan is saved verbatim —
 * nothing here assesses, grades, or prescribes.
 */
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  owners, pets, protocolInstances, exercisePlans, planItems, exercises as exercisesTbl,
  medicationEvents,
} from "@/lib/db/schema";

export interface OnboardingInput {
  name: string;
  species: "dog" | "cat";
  breed?: string;
  /** free text e.g. "12 yr" — parsed to an approximate date_of_birth */
  age?: string;
  senior: boolean;
  /** chronic_conditions tags (e.g. osteoarthritis, ivdd, post_op) */
  conditions: string[];
  /** protocol_templates id (tplo_post_op | ivdd_conservative) or null */
  template?: string | null;
  /** free-text surgery/onset date */
  onsetDate?: string;
  /** owner's vet clinic + phone — the escalation destination (optional, captured-only) */
  vetClinic?: string;
  vetPhone?: string;
  hasPlan?: "yes" | "no" | null;
  prescriber?: string;
  /** exercises ids the vet prescribed */
  exercises: string[];
  meds: { name: string; timing: string }[];
}

function dobFromAge(age: string | undefined): string | null {
  const m = age?.match(/(\d+)\s*(?:yr|year|y)/i);
  if (!m) return null;
  const d = new Date();
  d.setFullYear(d.getFullYear() - Number(m[1]));
  return d.toISOString().slice(0, 10);
}

function toDateOrToday(input: string | undefined): string {
  if (input) {
    const d = new Date(input);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * Create the pet (and related records) for the signed-in owner; returns the new pet id.
 * The owner already exists (created at sign-up) — we attribute the pet to them and, if
 * vet-contact details were captured, fold them onto that owner row.
 */
export async function createPetFromOnboarding(input: OnboardingInput, ownerId: string): Promise<string> {
  if (!ownerId) throw new Error("Onboarding requires a signed-in owner.");
  if (!input.name.trim() || (input.species !== "dog" && input.species !== "cat")) {
    throw new Error("Onboarding requires a name and species.");
  }
  const db = getDb();

  // Fold any captured vet-contact details onto the existing owner (escalation target).
  const vetClinic = input.vetClinic?.trim() || null;
  const vetPhone = input.vetPhone?.trim() || null;
  if (vetClinic || vetPhone) {
    await db.update(owners).set({ vetClinic, vetPhone }).where(eq(owners.id, ownerId));
  }

  const [pet] = await db.insert(pets).values({
    ownerId,
    name: input.name.trim(),
    species: input.species,
    breed: input.breed?.trim() || null,
    dateOfBirth: dobFromAge(input.age),
    isSenior: input.senior,
    chronicConditions: input.conditions.filter((c) => c !== "none"),
  }).returning({ id: pets.id });

  if (input.template) {
    await db.insert(protocolInstances).values({
      petId: pet.id,
      templateId: input.template,
      onsetDate: toDateOrToday(input.onsetDate),
      status: "active",
    });
  }

  if (input.hasPlan === "yes" && input.exercises.length) {
    const [plan] = await db.insert(exercisePlans).values({
      petId: pet.id,
      prescriberName: input.prescriber?.trim() || "Your vet",
      prescriberCredential: "rehab_vet",
      status: "active",
    }).returning({ id: exercisePlans.id });

    // pull the default FITT for each selected exercise so the plan has real doses
    const libRows = await db.select({ id: exercisesTbl.id, fitt: exercisesTbl.defaultFitt })
      .from(exercisesTbl).where(inArray(exercisesTbl.id, input.exercises));
    const fittById = new Map(libRows.map((r) => [r.id, r.fitt as { sets?: number; reps?: number } | null]));

    await db.insert(planItems).values(
      input.exercises.map((exerciseId) => {
        const f = fittById.get(exerciseId) ?? null;
        return {
          planId: plan.id,
          exerciseId,
          targetSets: f?.sets ?? null,
          targetReps: f?.reps ?? null,
          fitt: f,
        };
      }),
    );
  }

  if (input.meds.length) {
    await db.insert(medicationEvents).values(
      input.meds.map((m) => ({ petId: pet.id, medName: m.name.trim(), given: false })),
    );
  }

  return pet.id;
}
