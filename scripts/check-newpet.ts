/** Inspect what a freshly-onboarded pet (no history) renders — to find empty-state gaps.
 *  Creates a pet, prints the assembled view, then cleans up. Throwaway. */
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { createPetFromOnboarding } from "../lib/data/onboarding-write";
import { getPetViewFromDb } from "../lib/data/queries";
import { getMediaTimeline } from "../lib/data/media";
import { getDb } from "../lib/db/client";
import { owners, pets } from "../lib/db/schema";

async function main() {
  const db0 = getDb();
  const [owner] = await db0.insert(owners).values({
    email: `inspect-${randomUUID()}@goldvale.app`, displayName: "Inspect owner",
  }).returning({ id: owners.id });
  const petId = await createPetFromOnboarding({
    name: "Luna", species: "cat", breed: "Domestic shorthair", age: "11 yr", senior: true,
    conditions: ["osteoarthritis"], template: null, onsetDate: "",
    hasPlan: "no", prescriber: "", exercises: [], meds: [{ name: "Meloxicam 0.5 mg", timing: "Morning" }],
  }, owner.id);
  console.log("new pet:", petId);

  const v = await getPetViewFromDb(petId);
  if (!v) throw new Error("view null");
  const d = v.dashboard;
  console.log("HEADER   :", v.header.signalment, "| streak", v.header.streakDays, "| phase", JSON.stringify(v.header.phaseLabel), "| vet", v.header.vetName, "| next", v.header.nextVisit);
  console.log("MOBILITY :", JSON.stringify(d.mobility));
  console.log("QOL      :", JSON.stringify(d.qol));
  console.log("PROGRESS :", "fires", d.progression.fires, "| clean", d.progression.cleanSessions);
  console.log("PATTERN  :", JSON.stringify(d.pattern.occurrences), "emphasis:", d.pattern.emphasis);
  console.log("RECOVERY :", d.recovery.map((p) => `${p.week}(${p.state})`).join(" "), "| protocol", d.protocolLabel);
  console.log("EX TRACK :", "gated", v.exerciseTrack.gated, "| ex", v.exerciseTrack.exercises.length, "| adh", v.exerciseTrack.adherencePct);
  console.log("BRIEF    :", JSON.stringify(v.brief.snapshot), "| meds", v.brief.meds.length, "| mentions", v.brief.mentions.length);
  const media = await getMediaTimeline(petId);
  console.log("MEDIA    :", media.photoCount, "photos,", media.videoCount, "clips");

  const db = getDb();
  const [pet] = await db.select().from(pets).where(eq(pets.id, petId)).limit(1);
  await db.delete(owners).where(eq(owners.id, pet.ownerId));
  console.log("✓ cleaned up");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
