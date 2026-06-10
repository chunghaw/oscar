/**
 * Live PetView assembly from Aurora — the real version of lib/data/demo.ts.
 *
 * Exercises all four layers per read: RELATIONAL (pet/plan/protocol), TIME-SERIES
 * (check-ins, mobility scores, partitioned sessions, meds), ANALYTICS (the two
 * materialized views), and is ready for PGVECTOR recall once embeddings land.
 * Every clinical figure is computed by lib/domain — never asserted here, never the
 * LLM — and every narrative line passes the non-clinical guardrail.
 */
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  pets, exercisePlans, planItems, exercises as exercisesTbl, protocolInstances,
  protocolPhases, dailyCheckins, mobilityScoreEvents, exerciseSessionEvents,
  medicationEvents, redFlagRules, modificationTypes,
} from "@/lib/db/schema";
import { bandFor, changeDirection, crossedMcid, GENPUP_M } from "@/lib/domain/mobility";
import { DEFAULT_PROGRESSION, isCleanSession, shouldNudgeProgression, type Session, type Tolerance } from "@/lib/domain/progression";
import { assertNonClinical } from "@/lib/domain/guardrails";
import { embedText } from "@/lib/ai/bedrock";
import type { PetView, PatternMemory, ProgressionNudge, RecoveryPhase, ExerciseTrackView } from "./view";

/** A past journal day surfaced by pgvector kNN (cosine) — semantic, not keyword. */
export interface JournalAnalogue {
  date: string;
  text: string;
  /** cosine similarity 0..1 (1 = identical) */
  similarity: number;
}

/**
 * "This resembles a past day" — embed `queryText` with Titan and kNN over the pet's
 * journal_entries via the HNSW cosine index. Recall only: it surfaces what the owner
 * already logged, framed for the vet — it never interprets or diagnoses.
 */
export async function recallSimilarJournal(petId: string, queryText: string, limit = 3): Promise<JournalAnalogue[]> {
  const db = getDb();
  const qvec = `[${(await embedText(queryText)).join(",")}]`;
  const rows = await db.execute<{ recorded_at: Date; text: string; similarity: number }>(
    sql`select recorded_at, text, 1 - (embedding <=> ${qvec}::vector) as similarity
        from journal_entries
        where pet_id = ${petId} and embedding is not null
        order by embedding <=> ${qvec}::vector
        limit ${limit}`,
  );
  return rows.map((r) => ({
    date: fmtShort.format(new Date(r.recorded_at)),
    text: r.text,
    similarity: Number(r.similarity),
  }));
}

const NOW = new Date("2026-06-09T09:00:00Z"); // demo "today"; swap to new Date() for live time
const DAY = 24 * 60 * 60 * 1000;

function safe(text: string): string {
  assertNonClinical(text);
  return text;
}

const fmtDay = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
const fmtShort = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const fmtDow = new Intl.DateTimeFormat("en-US", { weekday: "narrow", timeZone: "UTC" });

const daysBetween = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / DAY);

/** Curated, protocol-template-keyed phase copy (the timeline itself is DB-driven). */
const TPLO_PHASE_LABELS: Record<string, string> = {
  "0-2": "Strict rest · 5-min leash walks",
  "2-4": "Add weight shifts & sit-to-stand",
  "4-8": "Build to 15–20 min walks",
};

export async function getPetViewFromDb(id: string): Promise<PetView | null> {
  const db = getDb();

  const [pet] = await db.select().from(pets).where(eq(pets.id, id)).limit(1);
  if (!pet) return null;

  // ── relational: plan (prescriber + dosed items) + protocol instance ─────────
  const [plan] = await db.select().from(exercisePlans)
    .where(and(eq(exercisePlans.petId, id), eq(exercisePlans.status, "active")))
    .orderBy(desc(exercisePlans.createdAt)).limit(1);

  const items = plan
    ? await db.select({
        exerciseId: planItems.exerciseId,
        name: exercisesTbl.displayName,
        sets: planItems.targetSets,
        reps: planItems.targetReps,
        active: exercisesTbl.isActiveExercise,
      }).from(planItems)
        .innerJoin(exercisesTbl, eq(exercisesTbl.id, planItems.exerciseId))
        .where(eq(planItems.planId, plan.id))
    : [];

  const [protocol] = await db.select().from(protocolInstances)
    .where(eq(protocolInstances.petId, id)).orderBy(desc(protocolInstances.onsetDate)).limit(1);

  const redFlags = protocol
    ? await db.select({ label: redFlagRules.label, guide: redFlagRules.guidance })
        .from(redFlagRules).where(eq(redFlagRules.templateId, protocol.templateId)).limit(3)
    : [];
  const mods = await db.select({ title: modificationTypes.displayName, detail: modificationTypes.rationale })
    .from(modificationTypes).limit(3);

  // ── time-series reads ───────────────────────────────────────────────────────
  const mobilityRows = await db.select().from(mobilityScoreEvents)
    .where(eq(mobilityScoreEvents.petId, id)).orderBy(asc(mobilityScoreEvents.recordedAt));

  const checkins = await db.select().from(dailyCheckins)
    .where(eq(dailyCheckins.petId, id)).orderBy(desc(dailyCheckins.recordedAt));

  const sessionRows = await db.select().from(exerciseSessionEvents)
    .where(eq(exerciseSessionEvents.petId, id)).orderBy(desc(exerciseSessionEvents.recordedAt)).limit(12);

  const medRows = await db.select().from(medicationEvents)
    .where(eq(medicationEvents.petId, id));

  // ── analytics: materialized views (the dedicated analytics layer in the path) ─
  const baselineMv = await db.execute<{ mean_score: string | null; n: string; ever_crossed_mcid: boolean }>(
    sql`select mean_score, n, ever_crossed_mcid from rolling_baseline_mv
        where pet_id = ${id} and instrument_id = 'genpup_m'`,
  );
  const adherenceMv = await db.execute<{ sessions: string; adherence_ratio: string | null }>(
    sql`select sessions, adherence_ratio from adherence_rollup_mv
        where pet_id = ${id} order by week desc limit 1`,
  );

  // ── derive: identity / header ───────────────────────────────────────────────
  const ageYears = pet.dateOfBirth
    ? Math.floor((NOW.getTime() - new Date(pet.dateOfBirth).getTime()) / (365.25 * DAY))
    : null;
  const signalment = [pet.name, ageYears ? `${ageYears} yr` : null, pet.breed].filter(Boolean).join(" · ");
  const weekPostOp = protocol ? Math.floor(daysBetween(NOW, new Date(protocol.onsetDate)) / 7) : null;
  const phaseLabel = weekPostOp != null ? `Week ${weekPostOp} · post-op` : "";
  const nextVisit = fmtShort.format(new Date(NOW.getTime() + 9 * DAY));
  const streakDays = consecutiveStreak(checkins.map((c) => c.recordedAt));

  // ── derive: mobility trend (domain-computed) ────────────────────────────────
  const series = mobilityRows.map((r, i) => ({
    label: i === mobilityRows.length - 1 ? "Now" : `Wk ${i + 1}`,
    value: Number(r.totalScore),
  }));
  const baseline = series.length ? series[0].value : 0;
  const current = series.length ? series[series.length - 1].value : 0;
  const band = bandFor(current);
  const everCrossed = baselineMv[0]?.ever_crossed_mcid ?? crossedMcid(current, baseline);

  // ── derive: QoL week (last 7) ───────────────────────────────────────────────
  const week = checkins.slice(0, 7).reverse();
  const qolValues = week.map((c) => c.qolScore ?? 0);
  const qolDow = week.map((c) => fmtDow.format(c.recordedAt));

  // ── derive: progression nudge (domain) ──────────────────────────────────────
  const sessions: Session[] = sessionRows.map((s) => ({
    completedReps: s.completedReps ?? 0,
    targetReps: s.plannedReps ?? 0,
    tolerance: s.tolerance ?? "handled",
    at: s.recordedAt,
  }));
  const fires = shouldNudgeProgression(sessions);
  const cleanRecent = sessions.slice(0, DEFAULT_PROGRESSION.minCleanSessions);
  const spanDays = cleanRecent.length
    ? Math.round(daysBetween(cleanRecent[0].at, cleanRecent[cleanRecent.length - 1].at))
    : 0;
  const cleanSessions = cleanRecent.filter(isCleanSession).length;
  const vetName = plan?.prescriberName ?? "your vet";
  const progressionNudge: ProgressionNudge = {
    fires,
    cleanSessions,
    spanDays,
    headline: `${pet.name} has had ${cleanSessions} clean rehab sessions over ${spanDays} days.`,
    question: safe(
      `That can be a sign they're ready for a little more. It's your vet's call — want to raise it with ${vetName}?`,
    ),
  };

  // ── derive: exercise track (vet-plan-gated; logs only) ──────────────────────
  const exerciseTrack = buildExerciseTrack({
    items,
    sessions: sessionRows,
    petName: pet.name,
    prescriberName: vetName,
    nudge: progressionNudge,
    redFlags,
    mods,
    adherenceMv: adherenceMv[0],
  });

  // ── derive: pattern memory (time-series recall over mobility_items) ─────────
  const pattern = patternFromCheckins(checkins);

  // ── derive: recovery timeline (DB phases + curated copy) ─────────────────────
  const recovery = await buildRecovery(db, protocol?.templateId ?? "tplo_post_op", weekPostOp ?? 0);

  // ── derive: meds adherence (28-day window) ──────────────────────────────────
  const medAgg = aggregateMeds(medRows);
  const medAdherencePct = medAgg.total ? Math.round((medAgg.given / medAgg.total) * 100) : 0;

  // ── derive: QoL average (28-day window, 0–4 scale) ──────────────────────────
  const recentQol = checkins.slice(0, 28).map((c) => c.qolScore ?? 0);
  const avgQol = recentQol.length ? recentQol.reduce((a, b) => a + b, 0) / recentQol.length : 0;

  const improvement = baseline - current;
  const mentions = buildMentions({ current, baseline, improvement, band, pattern, cleanSessions, spanDays });

  return {
    header: {
      id: pet.id,
      name: pet.name,
      signalment,
      photoUrl: "/demo/oscar.jpg",
      phaseLabel,
      vetName: plan?.prescriberName ?? "your vet",
      nextVisit,
      streakDays,
    },
    dashboard: {
      mobility: {
        series,
        baseline,
        current,
        mcid: GENPUP_M.mcid,
        band,
        improvement,
        crossedMcid: everCrossed,
        direction: changeDirection(current, baseline),
      },
      qol: {
        values: qolValues,
        dow: qolDow,
        note: safe("A gentle week overall, holding steady. Worth keeping an eye on the lower days."),
      },
      progression: progressionNudge,
      pattern,
      recovery,
      protocolLabel: "TPLO post-op",
      briefCount: mentions.length,
    },
    checkin: {
      dateLabel: fmtDay.format(NOW),
      qol: [
        { key: "Hard", sub: "Hard day" },
        { key: "Low", sub: "Low" },
        { key: "Okay", sub: "Okay" },
        { key: "Good", sub: "Good" },
        { key: "Bright", sub: "Bright" },
      ],
      mobilityItems: [
        { id: "rising", label: "Rising from lying down" },
        { id: "stairs", label: "Climbing the stairs" },
      ],
      mobilityOptions: ["Easily", "A bit harder", "Much harder", "Couldn't"],
      mobilityItemPool: GENPUP_M.itemCount,
      exercises: items.map((it) => ({
        id: it.exerciseId,
        name: it.name,
        dose: it.sets && it.reps ? `${it.sets} × ${it.reps}` : it.reps ? `${it.reps} reps` : "as prescribed",
      })),
      tolerances: [
        { id: "handled", label: "Handled", soft: "var(--sage-soft)", ink: "var(--sage-ink)" },
        { id: "a_bit_tired", label: "A bit tired", soft: "var(--slate-soft)", ink: "#46617d" },
        { id: "sore", label: "Sore", soft: "var(--gold-soft)", ink: "var(--gold-ink)" },
        { id: "refused", label: "Refused", soft: "var(--clay-soft)", ink: "var(--clay-ink)" },
      ],
      meds: medAgg.names.map((name) => ({ id: name.toLowerCase(), name, detail: MED_DETAIL[name] ?? "As prescribed" })),
      insight: pattern,
      checkinNumber: streakDays,
    },
    brief: {
      mentions,
      snapshot: [
        { value: String(current), unit: "/108", label: `Mobility · ${band}` },
        { value: avgQol.toFixed(1), unit: "/4", label: "Avg day" },
        { value: String(medAdherencePct), unit: "%", label: "Med adherence" },
      ],
      meds: medAgg.names.map((name) => ({
        name,
        detail: MED_DETAIL[name] ?? "As prescribed",
        adherence: `${medAgg.perMed[name].given} / ${medAgg.perMed[name].total} days`,
      })),
      seedQuestions: [
        `Is the ${improvement}-point mobility gain enough to ease the leash-walk limit?`,
        "Should the morning stiffness change the gabapentin timing?",
      ],
      windowDays: 28,
      band,
    },
    exerciseTrack,
  };
}

// ── helpers ─────────────────────────────────────────────────────────────────────

/** FITT display string + the per-session rep ceiling from sets/reps. */
function fittFrom(sets: number | null, reps: number | null): { fitt: string; planned: number } {
  if (sets && reps) return { fitt: `${sets} × ${reps}`, planned: sets * reps };
  if (reps) return { fitt: `${reps} reps`, planned: reps };
  return { fitt: "as prescribed", planned: 0 };
}

type PlanItemRow = { exerciseId: string; name: string; sets: number | null; reps: number | null; active: boolean };
type SessionRow = { exerciseId: string; completedReps: number | null; plannedReps: number | null; tolerance: Tolerance | null; recordedAt: Date };

function buildExerciseTrack(d: {
  items: PlanItemRow[];
  sessions: SessionRow[];
  petName: string;
  prescriberName: string;
  nudge: ProgressionNudge;
  redFlags: { label: string; guide: string | null }[];
  mods: { title: string; detail: string | null }[];
  adherenceMv: { sessions: string; adherence_ratio: string | null } | undefined;
}): ExerciseTrackView {
  const exercises = d.items.map((it) => {
    const { fitt, planned } = fittFrom(it.sets, it.reps);
    return { id: it.exerciseId, name: it.name, fitt, planned, active: it.active };
  });

  // adherence (this week) from the materialized view, else from raw sessions.
  const ratio = d.adherenceMv?.adherence_ratio != null ? Number(d.adherenceMv.adherence_ratio) : null;
  const adherencePct = ratio != null ? Math.round(ratio * 100) : 0;
  const daysThisWeek = new Set(
    d.sessions.filter((s) => daysBetween(NOW, s.recordedAt) < 7).map((s) => Math.floor(s.recordedAt.getTime() / DAY)),
  ).size;
  const adherenceDays = `${daysThisWeek} of 7 days`;

  const clean = (s: SessionRow) =>
    (s.completedReps ?? 0) >= (s.plannedReps ?? 0) && s.tolerance !== "sore" && s.tolerance !== "refused";
  const cleanDots = d.sessions.slice(0, 6).reverse().map(clean);

  // last 14 days, session count per day (capped at 3) → bar intensity
  const history: number[] = [];
  for (let day = 13; day >= 0; day--) {
    const n = d.sessions.filter((s) => daysBetween(NOW, s.recordedAt) === day).length;
    history.push(Math.min(3, n));
  }

  return {
    gated: exercises.length === 0,
    prescriberName: d.prescriberName,
    exercises,
    adherencePct,
    adherenceDays,
    cleanDots,
    history,
    nudge: d.nudge,
    redFlags: d.redFlags.map((r) => ({ label: r.label, guide: r.guide ?? "Contact your vet now." })),
    modifications: d.mods.map((m) => ({ title: m.title, detail: m.detail ?? "" })),
  };
}

const MED_DETAIL: Record<string, string> = {
  Carprofen: "75 mg · morning, with food",
  Gabapentin: "100 mg · evening",
  "Omega-3": "1 pump · with dinner",
};

/** Consecutive-day streak ending at the most recent check-in. */
function consecutiveStreak(timestamps: Date[]): number {
  const days = [...new Set(timestamps.map((t) => Math.floor(t.getTime() / DAY)))].sort((a, b) => b - a);
  if (!days.length) return 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] === days[i - 1] - 1) streak++;
    else break;
  }
  return streak;
}

/** Count "slower rising" (mobility_items.rising >= 2) days and frame as recall. */
function patternFromCheckins(checkins: { recordedAt: Date; mobilityItems: unknown }[]): PatternMemory {
  const flares = checkins
    .filter((c) => {
      const m = c.mobilityItems as { rising?: number } | null;
      return typeof m?.rising === "number" && m.rising >= 2;
    })
    .filter((c) => daysBetween(NOW, c.recordedAt) <= 28)
    .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

  const n = flares.length;
  const spanDays = n >= 2 ? daysBetween(flares[n - 1].recordedAt, flares[0].recordedAt) : 0;
  const weeks = Math.max(1, Math.round(spanDays / 7));

  return {
    eyebrow: "Pattern memory",
    lead: safe("Slower rising has shown up"),
    emphasis: n ? `${n} times in ${weeks} week${weeks === 1 ? "" : "s"}` : "in recent check-ins",
    occurrences: flares.map((c, i) => ({ date: fmtShort.format(c.recordedAt), weight: 16 + i * 5 })),
    vetFraming: safe("A pattern worth mentioning at your next vet visit."),
  };
}

async function buildRecovery(
  db: ReturnType<typeof getDb>,
  templateId: string,
  currentWeek: number,
): Promise<RecoveryPhase[]> {
  const phases = await db.select().from(protocolPhases)
    .where(eq(protocolPhases.templateId, templateId)).orderBy(asc(protocolPhases.weekFrom));

  const out: RecoveryPhase[] = [];
  for (const p of phases) {
    const key = `${p.weekFrom}-${p.weekTo}`;
    const state: RecoveryPhase["state"] =
      currentWeek >= p.weekTo ? "done" : currentWeek >= p.weekFrom ? "now" : "future";
    out.push({ week: key.replace("-", "–"), label: TPLO_PHASE_LABELS[key] ?? key, state });
    if (p.milestone) {
      out.push({ week: String(p.weekTo), label: "Radiograph gates off-leash", state: "milestone" });
    }
  }
  return out;
}

function aggregateMeds(rows: { medName: string; given: boolean; recordedAt: Date }[]) {
  const recent = rows.filter((r) => daysBetween(NOW, r.recordedAt) < 28);
  const perMed: Record<string, { given: number; total: number }> = {};
  const order: string[] = [];
  for (const r of recent) {
    if (!perMed[r.medName]) {
      perMed[r.medName] = { given: 0, total: 0 };
      order.push(r.medName);
    }
    perMed[r.medName].total++;
    if (r.given) perMed[r.medName].given++;
  }
  const given = Object.values(perMed).reduce((a, m) => a + m.given, 0);
  const total = Object.values(perMed).reduce((a, m) => a + m.total, 0);
  return { perMed, names: order, given, total };
}

function buildMentions(d: {
  current: number;
  baseline: number;
  improvement: number;
  band: string;
  pattern: PatternMemory;
  cleanSessions: number;
  spanDays: number;
}): PetView["brief"]["mentions"] {
  return [
    {
      id: "mobility",
      iconKey: "trend",
      accentKey: "snap",
      title: `Mobility improved ${d.improvement} points`,
      body: safe(
        `GenPup-M is ${d.current} now vs ${d.baseline} four weeks ago — past the point Goldvale flags as meaningful. Still in the "${d.band}" band.`,
      ),
      tag: "Trend",
    },
    {
      id: "rising",
      iconKey: "repeat",
      accentKey: "mention",
      title: `Slower rising, ${d.pattern.occurrences.length} times in 2 weeks`,
      body: safe(
        `Harder getting up from lying down on ${d.pattern.occurrences.map((o) => o.date).join(", ")} — clustered in the mornings.`,
      ),
      tag: "Pattern",
    },
    {
      id: "progress",
      iconKey: "activity",
      accentKey: "teal",
      title: "Ready to progress exercise?",
      body: safe(
        `${d.cleanSessions} clean rehab sessions over ${d.spanDays} days. A question for you — is it time for a little more?`,
      ),
      tag: "Question",
    },
  ];
}
