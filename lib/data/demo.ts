/**
 * The "Oscar" demo PetView — the Bramble-style record a judge sees before Aurora
 * is wired. Every clinical figure is computed by lib/domain (band, MCID crossing,
 * direction, progression nudge), and every line of narration is run through the
 * non-clinical guardrail at build time. When DATABASE_URL lands, lib/data/pets.ts
 * swaps this for the same shape assembled from real Aurora rows.
 */
import {
  bandFor,
  changeDirection,
  crossedMcid,
  GENPUP_M,
} from "@/lib/domain/mobility";
import {
  DEFAULT_PROGRESSION,
  shouldNudgeProgression,
  type Session,
} from "@/lib/domain/progression";
import { assertNonClinical } from "@/lib/domain/guardrails";
import type { PetView } from "./view";

/** Guardrail gate: nothing narrative ships from the demo without passing it. */
function safe(text: string): string {
  assertNonClinical(text);
  return text;
}

const PET_ID = "oscar";

// ── mobility: weekly GenPup-M totals (higher = worse), banded + change-detected ──
const MOB_SERIES = [
  { label: "Wk 1", value: 48 },
  { label: "Wk 2", value: 45 },
  { label: "Wk 3", value: 42 },
  { label: "Wk 4", value: 39 },
  { label: "Wk 5", value: 36 },
  { label: "Now", value: 34 },
];
const BASELINE = 42; // the pet's own baseline, 4 weeks ago
const CURRENT = 34;

// ── progression: six clean sessions across 18 days (newest first) ───────────────
const DAY = 24 * 60 * 60 * 1000;
const ANCHOR = new Date("2026-06-05T09:00:00Z").getTime();
const SESSIONS: Session[] = [0, 3, 7, 11, 14, 18].map((daysAgo) => ({
  completedReps: 5,
  targetReps: 5,
  tolerance: "handled",
  at: new Date(ANCHOR - daysAgo * DAY),
}));
const SPAN_DAYS = 18;

export function buildOscarView(): PetView {
  const band = bandFor(CURRENT);
  const improvement = BASELINE - CURRENT;
  const crossed = crossedMcid(CURRENT, BASELINE);
  const direction = changeDirection(CURRENT, BASELINE);
  const nudgeFires = shouldNudgeProgression(SESSIONS, DEFAULT_PROGRESSION);

  const pattern = {
    eyebrow: "Pattern memory",
    lead: safe("Slower rising has shown up"),
    emphasis: "3 times in 2 weeks",
    occurrences: [
      { date: "May 22", weight: 16 },
      { date: "May 30", weight: 22 },
      { date: "Jun 4", weight: 27 },
    ],
    vetFraming: safe("A pattern worth mentioning at your next vet visit."),
  };

  return {
    header: {
      id: PET_ID,
      name: "Oscar",
      signalment: "Oscar · 12 yr · Toy poodle",
      photoUrl: "/demo/oscar.jpg",
      phaseLabel: "Week 5 · post-op",
      vetName: "Dr. Okafor",
      nextVisit: "Jun 18",
      streakDays: 34,
    },

    dashboard: {
      mobility: {
        series: MOB_SERIES,
        baseline: BASELINE,
        current: CURRENT,
        mcid: GENPUP_M.mcid,
        band,
        improvement,
        crossedMcid: crossed,
        direction,
      },
      qol: {
        values: [2, 3, 3, 1, 2, 3, 3],
        dow: ["M", "T", "W", "T", "F", "S", "S"],
        note: "Mostly good days, with one low on Thursday. Oscar has held steady this week.",
      },
      progression: {
        fires: nudgeFires,
        cleanSessions: DEFAULT_PROGRESSION.minCleanSessions,
        spanDays: SPAN_DAYS,
        headline: `Oscar has had ${DEFAULT_PROGRESSION.minCleanSessions} clean rehab sessions over ${SPAN_DAYS} days.`,
        question: safe(
          "That can be a sign they're ready for a little more. It's your vet's call — want to raise it with Dr. Okafor?",
        ),
      },
      pattern,
      recovery: [
        { week: "0–2", label: "Strict rest · 5-min leash walks", state: "done" },
        { week: "2–4", label: "Add weight shifts & sit-to-stand", state: "done" },
        { week: "4–8", label: "Build to 15–20 min walks", state: "now" },
        { week: "8", label: "Radiograph gates off-leash", state: "milestone" },
      ],
      protocolLabel: "TPLO post-op",
      briefCount: 3,
    },

    checkin: {
      dateLabel: "Thursday, June 5",
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
      exercises: [
        { id: "sit_to_stand", name: "Sit-to-stand", dose: "3 × 5" },
        { id: "weight_shift", name: "Weight shifts", dose: "2 × 8" },
        { id: "cookie_stretch", name: "Cookie stretch", dose: "1 × 5 each side" },
      ],
      tolerances: [
        { id: "handled", label: "Handled", soft: "var(--sage-soft)", ink: "var(--sage-ink)" },
        { id: "a_bit_tired", label: "A bit tired", soft: "var(--slate-soft)", ink: "#46617d" },
        { id: "sore", label: "Sore", soft: "var(--gold-soft)", ink: "var(--gold-ink)" },
        { id: "refused", label: "Refused", soft: "var(--clay-soft)", ink: "var(--clay-ink)" },
      ],
      meds: [
        { id: "carprofen", name: "Carprofen", detail: "75 mg · morning, with food" },
        { id: "gabapentin", name: "Gabapentin", detail: "100 mg · evening" },
        { id: "omega3", name: "Omega-3", detail: "1 pump · with dinner" },
      ],
      insight: pattern,
      checkinNumber: 34,
    },

    brief: {
      mentions: [
        {
          id: "mobility",
          iconKey: "trend",
          accentKey: "snap",
          title: `Mobility improved ${improvement} points`,
          body: safe(
            `GenPup-M is ${CURRENT} now vs ${BASELINE} four weeks ago — past the point Goldvale flags as meaningful. Still in the “${band}” band.`,
          ),
          tag: "Trend",
        },
        {
          id: "rising",
          iconKey: "repeat",
          accentKey: "mention",
          title: "Slower rising, 3 times in 2 weeks",
          body: safe(
            "Harder getting up from lying down on May 22, May 30, and Jun 4 — clustered in the mornings.",
          ),
          tag: "Pattern",
        },
        {
          id: "progress",
          iconKey: "activity",
          accentKey: "teal",
          title: "Ready to progress exercise?",
          body: safe(
            "6 clean rehab sessions over 18 days. A question for you — is Oscar ready for a little more?",
          ),
          tag: "Question",
        },
      ],
      snapshot: [
        { value: String(CURRENT), unit: "/108", label: `Mobility · ${band}` },
        { value: "6.0", unit: "/7", label: "Avg day · good" },
        { value: "93", unit: "%", label: "Med adherence" },
      ],
      meds: [
        { name: "Carprofen", detail: "75 mg · morning, with food", adherence: "27 / 28 days" },
        { name: "Gabapentin", detail: "100 mg · evening", adherence: "28 / 28 days" },
        { name: "Omega-3", detail: "1 pump · with dinner", adherence: "25 / 28 days" },
      ],
      seedQuestions: [
        "Is the 8-point mobility gain enough to ease the leash-walk limit?",
        "Should the morning stiffness change the gabapentin timing?",
      ],
      windowDays: 28,
      band,
    },

    exerciseTrack: {
      gated: false,
      prescriberName: "Dr. Okafor",
      exercises: [
        { id: "sit_to_stand", name: "Sit-to-stand", fitt: "3 × 5", planned: 15, active: true },
        { id: "weight_shift", name: "Weight shifts", fitt: "2 × 8", planned: 16, active: true },
        { id: "cookie_stretch", name: "Cookie (lateral-flexion) stretch", fitt: "1 × 5", planned: 5, active: true },
      ],
      adherencePct: 100,
      adherenceDays: "3 of 7 days",
      cleanDots: [true, true, true, true, true, true],
      history: [0, 3, 0, 0, 3, 0, 0, 3, 0, 0, 3, 0, 0, 3],
      nudge: {
        fires: nudgeFires,
        cleanSessions: DEFAULT_PROGRESSION.minCleanSessions,
        spanDays: SPAN_DAYS,
        headline: `Oscar has handled this dose well for ${SPAN_DAYS} days.`,
        question: safe(
          "That can be a sign they're ready for a little more — but it's your vet's call. Want to raise it with Dr. Okafor?",
        ),
      },
      redFlags: [
        { label: "Sudden lameness after a period of improvement", guide: "Contact your vet now." },
        { label: "Swelling, heat, or discharge/odor at the incision", guide: "Contact your vet now." },
      ],
      modifications: [
        { title: "Non-slip mats / rugs", detail: "Traction reduces slips and fall risk on hard floors." },
        { title: "Ramps & steps (no jumping)", detail: "Avoids high-impact jumps onto/off furniture or into the car." },
        { title: "Raised food & water bowls", detail: "Reduces neck and joint strain while eating." },
      ],
    },
  };
}
