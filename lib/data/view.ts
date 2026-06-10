/**
 * View-models for the three demo-critical screens. These are the typed contract
 * between the data layer (lib/data) and the presentational components — every
 * clinical figure on them is computed by lib/domain, never asserted here.
 */
import type { MobilityBand } from "@/lib/domain/mobility";
import type { Tolerance } from "@/lib/domain/progression";

/** Identity + signalment shared across all three screens' heroes. */
export interface PetHeader {
  id: string;
  name: string;
  /** e.g. "Oscar · 12 yr · Toy poodle" */
  signalment: string;
  photoUrl: string;
  /** e.g. "Week 5 · post-op" */
  phaseLabel: string;
  vetName: string;
  /** display date, e.g. "Jun 18" */
  nextVisit: string;
  streakDays: number;
}

// ── dashboard ──────────────────────────────────────────────────────────────────
export interface MobilityPoint {
  label: string;
  value: number;
}

export interface MobilityTrend {
  series: MobilityPoint[];
  baseline: number;
  current: number;
  mcid: number;
  band: MobilityBand;
  /** baseline − current; positive = improvement (GenPup-M is higher = worse). */
  improvement: number;
  crossedMcid: boolean;
  direction: "worse" | "better" | "stable";
}

export interface QolWeek {
  /** last 7 QoL scores, 0..4 */
  values: number[];
  dow: string[];
  note: string;
}

/** A progression nudge — only ever a question; `fires` comes from lib/domain. */
export interface ProgressionNudge {
  fires: boolean;
  cleanSessions: number;
  spanDays: number;
  headline: string;
  question: string;
}

export interface PatternOccurrence {
  date: string;
  /** relative bar height for the sparkline chips */
  weight: number;
}

export interface PatternMemory {
  /** uppercase eyebrow, e.g. "Pattern memory" */
  eyebrow: string;
  lead: string;
  emphasis: string;
  occurrences: PatternOccurrence[];
  /** the vet-framing line; must read as recall, never diagnosis */
  vetFraming: string;
}

export interface RecoveryPhase {
  week: string;
  label: string;
  state: "done" | "now" | "milestone" | "future";
}

export interface DashboardView {
  mobility: MobilityTrend;
  qol: QolWeek;
  progression: ProgressionNudge;
  pattern: PatternMemory;
  recovery: RecoveryPhase[];
  /** TPLO/IVDD-style protocol label, e.g. "TPLO post-op" */
  protocolLabel: string;
  briefCount: number;
}

// ── daily check-in ──────────────────────────────────────────────────────────────
export interface QolOption {
  key: string;
  sub: string;
}

export interface MobilityCheckItem {
  id: string;
  label: string;
}

export interface PlanExercise {
  id: string;
  name: string;
  dose: string;
}

export interface ToleranceOption {
  id: Tolerance;
  label: string;
  soft: string;
  ink: string;
}

export interface MedSchedule {
  id: string;
  name: string;
  detail: string;
}

export interface CheckinConfig {
  /** display date, e.g. "Thursday, June 5" */
  dateLabel: string;
  qol: QolOption[];
  mobilityItems: MobilityCheckItem[];
  mobilityOptions: string[];
  /** how many of the 24 GenPup-M items the rotating sample draws from */
  mobilityItemPool: number;
  exercises: PlanExercise[];
  tolerances: ToleranceOption[];
  meds: MedSchedule[];
  /** post-submit recall card (pgvector pattern memory) */
  insight: PatternMemory;
  /** confirmation copy after a save */
  checkinNumber: number;
}

// ── vet brief ───────────────────────────────────────────────────────────────────
export interface BriefMention {
  id: string;
  iconKey: "trend" | "repeat" | "activity";
  accentKey: "snap" | "mention" | "teal";
  title: string;
  body: string;
  tag: "Trend" | "Pattern" | "Question";
}

export interface SnapshotStat {
  value: string;
  unit: string;
  label: string;
}

export interface MedAdherence {
  name: string;
  detail: string;
  adherence: string;
}

export interface BriefView {
  mentions: BriefMention[];
  snapshot: SnapshotStat[];
  meds: MedAdherence[];
  seedQuestions: string[];
  windowDays: number;
  band: MobilityBand;
}

// ── exercise track ──────────────────────────────────────────────────────────────
export interface TrackExercise {
  id: string;
  name: string;
  /** FITT dose display, e.g. "3 × 5" */
  fitt: string;
  /** target reps for the session (sets × reps) — the stepper ceiling */
  planned: number;
  /** active (preferred) vs passive modality */
  active: boolean;
}

export interface RedFlag {
  label: string;
  guide: string;
}

export interface HomeModification {
  title: string;
  detail: string;
}

export interface ExerciseTrackView {
  /** true when there's no active vet plan — show the on-ramp, never exercises */
  gated: boolean;
  prescriberName: string;
  exercises: TrackExercise[];
  /** weekly adherence %, computed from adherence_rollup_mv */
  adherencePct: number;
  /** e.g. "3 of 7 days" */
  adherenceDays: string;
  /** last 6 sessions, true = clean (dose met + tolerance handled/a-bit-tired) */
  cleanDots: boolean[];
  /** last 14 days, 0 = rest else session intensity 1..3 */
  history: number[];
  nudge: ProgressionNudge;
  redFlags: RedFlag[];
  modifications: HomeModification[];
}

// ── the whole pet, for any route ────────────────────────────────────────────────
export interface PetView {
  header: PetHeader;
  dashboard: DashboardView;
  checkin: CheckinConfig;
  brief: BriefView;
  exerciseTrack: ExerciseTrackView;
}
