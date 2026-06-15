/**
 * Seed the "Oscar" demo record — a real 34-day history in Aurora so the three
 * screens render from live queries, not hardcoded demo data. Re-runnable: wipes
 * the demo owner (cascades) + Oscar's partitioned sessions, then re-inserts.
 *
 * Run after migrate + seed:  npx tsx --env-file=.env scripts/seed-demo-pet.ts
 *
 * Story it encodes (so lib/domain produces the intended trend):
 *   • GenPup-M weekly totals 42→34 → 8-pt improvement crossing MCID, "mild" band
 *   • 7 clean rehab sessions over 18 days → progression nudge fires (question)
 *   • "slower rising" flagged on 3 days in the last ~2.5 weeks → pattern memory
 *   • meds Carprofen 27/28 · Gabapentin 28/28 · Omega-3 25/28
 * Journal + mobility vectors are embedded inline (best-effort) so semantic recall is
 * demo-ready straight from this one script.
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "../lib/db/client";
import {
  owners, pets, exercisePlans, planItems, protocolInstances,
  dailyCheckins, mobilityScoreEvents, exerciseSessionEvents,
  medicationEvents, journalEntries, bcsMcsEvents,
} from "../lib/db/schema";
import { bandFor, crossedMcid } from "../lib/domain/mobility";
import { embedTexts } from "../lib/ai/bedrock";
import { DEMO_OWNER_EMAIL, OSCAR_PET_ID } from "../lib/data/ids";

const NOW = new Date("2026-06-09T09:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
/** A timestamp `d` days before NOW. */
const daysAgo = (d: number, h = 9) => new Date(NOW.getTime() - d * DAY + (h - 9) * 60 * 60 * 1000);
/** 'YYYY-MM-DD' `d` days before NOW (for date columns). */
const dateAgo = (d: number) => daysAgo(d).toISOString().slice(0, 10);

async function main() {
  const db = getDb();

  // ── wipe prior demo data (owner cascade + partitioned sessions have no FK) ──
  await db.delete(exerciseSessionEvents).where(eq(exerciseSessionEvents.petId, OSCAR_PET_ID));
  await db.delete(owners).where(eq(owners.email, DEMO_OWNER_EMAIL));

  // ── relational: owner → pet → plan → protocol ──────────────────────────────
  const [owner] = await db.insert(owners).values({
    email: DEMO_OWNER_EMAIL, displayName: "Demo Owner",
    vetClinic: "Riverside Veterinary Clinic", vetPhone: "+61 2 9555 0142",
  }).returning();

  await db.insert(pets).values({
    id: OSCAR_PET_ID, ownerId: owner.id, name: "Oscar", species: "dog",
    breed: "Toy poodle", dateOfBirth: "2014-03-01", isSenior: true,
    chronicConditions: ["cruciate_postop"],
  });

  const [plan] = await db.insert(exercisePlans).values({
    petId: OSCAR_PET_ID, prescriberName: "Dr. Okafor", prescriberCredential: "rehab_vet", status: "active",
  }).returning();
  await db.insert(planItems).values([
    { planId: plan.id, exerciseId: "sit_to_stand", targetSets: 3, targetReps: 5, fitt: { sets: 3, reps: 5 } },
    { planId: plan.id, exerciseId: "weight_shift", targetSets: 2, targetReps: 8, fitt: { sets: 2, reps: 8 } },
    { planId: plan.id, exerciseId: "cookie_stretch", targetSets: 1, targetReps: 5, fitt: { sets: 1, reps: 5 } },
  ]);

  // Week 5 post-op → onset 35 days ago (TPLO 4–8wk phase is "now").
  await db.insert(protocolInstances).values({
    petId: OSCAR_PET_ID, templateId: "tplo_post_op", onsetDate: dateAgo(35), status: "active",
  });

  // ── time-series: 34 daily check-ins (qol 0–4 + rotating mobility items) ──────
  // last 7 days (d=6..0) = [2,3,3,1,2,3,3] for the dashboard "week in mood".
  const lastSeven: Record<number, number> = { 6: 2, 5: 3, 4: 3, 3: 1, 2: 2, 1: 3, 0: 3 };
  const FLARE_DAYS = new Set([18, 10, 5]); // "slower rising" on 3 recent-ish days
  const checkins = [];
  for (let d = 33; d >= 0; d--) {
    const rising = FLARE_DAYS.has(d) ? 2 : d % 4 === 0 ? 1 : 0; // 0 easily … 2 much harder
    const qol = lastSeven[d] ?? (d % 5 === 0 ? 2 : 3);
    checkins.push({
      petId: OSCAR_PET_ID,
      recordedAt: daysAgo(d),
      qolScore: qol,
      mobilityItems: { rising, stairs: d % 3 === 0 ? 1 : 0 },
      note: FLARE_DAYS.has(d) ? "Slower getting up from lying down this morning." : null,
    });
  }
  await db.insert(dailyCheckins).values(checkins);

  // ── time-series: weekly GenPup-M totals 42→34 (higher = worse) ──────────────
  const WEEKLY = [
    { d: 35, total: 42 }, { d: 28, total: 40 }, { d: 21, total: 39 },
    { d: 14, total: 37 }, { d: 7, total: 36 }, { d: 0, total: 34 },
  ];
  const baseline = WEEKLY[0].total;
  await db.insert(mobilityScoreEvents).values(
    WEEKLY.map((w) => ({
      petId: OSCAR_PET_ID, instrumentId: "genpup_m", recordedAt: daysAgo(w.d),
      rawSubscores: { weeklyTotal: w.total },
      totalScore: String(w.total),
      crossedMcid: crossedMcid(w.total, baseline), // computed by code, not the LLM
      periodNarrative: null,
    })),
  );

  // ── time-series (PARTITIONED): clean rehab sessions across 18 days ──────────
  const SESSION_DAYS = [18, 15, 12, 9, 6, 3, 0]; // newest 6 span 15 days ≥14 → nudge fires
  await db.insert(exerciseSessionEvents).values(
    SESSION_DAYS.map((d) => ({
      petId: OSCAR_PET_ID, exerciseId: "sit_to_stand", recordedAt: daysAgo(d),
      plannedReps: 5, completedReps: 5, tolerance: "handled" as const,
      fatigueFlags: { panting: false, lagging: false },
    })),
  );

  // ── time-series: medication adherence over 28 days (27/28, 28/28, 25/28) ────
  const MEDS = [
    { name: "Carprofen", misses: new Set([12]) },        // 27/28
    { name: "Gabapentin", misses: new Set<number>() },    // 28/28
    { name: "Omega-3", misses: new Set([3, 14, 22]) },    // 25/28
  ];
  const medRows = MEDS.flatMap((m) =>
    Array.from({ length: 28 }, (_, i) => ({
      petId: OSCAR_PET_ID, medName: m.name, given: !m.misses.has(i), recordedAt: daysAgo(i),
    })),
  );
  await db.insert(medicationEvents).values(medRows);

  // ── pgvector layer: journal entries (embedded just below) ──
  await db.insert(journalEntries).values([
    { petId: OSCAR_PET_ID, recordedAt: daysAgo(18), text: "Slow to rise this morning, eased up after a short walk." },
    { petId: OSCAR_PET_ID, recordedAt: daysAgo(10), text: "Stiff getting up again — better once moving." },
    { petId: OSCAR_PET_ID, recordedAt: daysAgo(5), text: "Harder to get up from the floor today, mornings seem worse." },
    { petId: OSCAR_PET_ID, recordedAt: daysAgo(1), text: "Good day — trotted to the door without hesitating." },
  ]);

  // ── slow monthly trend: body + muscle condition ─────────────────────────────
  await db.insert(bcsMcsEvents).values([
    { petId: OSCAR_PET_ID, bcs: 5, mcs: "mild loss", recordedAt: daysAgo(30) },
    { petId: OSCAR_PET_ID, bcs: 5, mcs: "mild loss", recordedAt: daysAgo(2) },
  ]);

  // ── embed the pgvector layer so semantic recall (the "days like this" kNN) runs on
  //    real vectors. Best-effort: the relational demo still seeds if Bedrock is down,
  //    and scripts/backfill-embeddings.ts can fill the vectors later. ──
  try {
    const jrows = await db.select().from(journalEntries)
      .where(and(eq(journalEntries.petId, OSCAR_PET_ID), isNull(journalEntries.embedding)));
    if (jrows.length) {
      const vecs = await embedTexts(jrows.map((j) => j.text));
      for (let i = 0; i < jrows.length; i++) {
        await db.update(journalEntries).set({ embedding: vecs[i] }).where(eq(journalEntries.id, jrows[i].id));
      }
    }
    const srows = await db.select().from(mobilityScoreEvents)
      .where(and(eq(mobilityScoreEvents.petId, OSCAR_PET_ID), isNull(mobilityScoreEvents.embedding)));
    if (srows.length) {
      const texts = srows.map((s) =>
        `GenPup-M mobility total ${Number(s.totalScore)} of 108, ${bandFor(Number(s.totalScore))} band, recorded ${s.recordedAt.toISOString().slice(0, 10)}.`);
      const vecs = await embedTexts(texts);
      for (let i = 0; i < srows.length; i++) {
        await db.update(mobilityScoreEvents).set({ embedding: vecs[i] }).where(eq(mobilityScoreEvents.id, srows[i].id));
      }
    }
    console.log(`✓ Embedded ${jrows.length} journal + ${srows.length} mobility vectors`);
  } catch (e) {
    console.warn("⚠ Embedding skipped (Bedrock unreachable) — run scripts/backfill-embeddings.ts later:", (e as Error).message);
  }

  // ── analytics: refresh the materialized views so reads see the new history ──
  await db.execute(sql`REFRESH MATERIALIZED VIEW rolling_baseline_mv`);
  await db.execute(sql`REFRESH MATERIALIZED VIEW adherence_rollup_mv`);

  console.log("✓ Seeded Oscar:", OSCAR_PET_ID);
  console.log(`  ${checkins.length} check-ins · ${WEEKLY.length} mobility scores · ${SESSION_DAYS.length} sessions · ${medRows.length} med events`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
