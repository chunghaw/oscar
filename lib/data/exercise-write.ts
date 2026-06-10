/**
 * Exercise-session persistence — the write core behind the exercise-track logging.
 * Pure DB write (no "use server", no revalidation) so it's directly testable.
 * One exercise_session_events row per logged exercise (the partitioned time-series).
 *
 * Non-clinical: this RECORDS adherence the owner reports. It never advances a dose —
 * progression is only ever surfaced as a question (lib/domain/progression.ts).
 */
import { getDb } from "@/lib/db/client";
import { exerciseSessionEvents } from "@/lib/db/schema";
import type { Tolerance } from "@/lib/domain/progression";

export interface LogSessionInput {
  petId: string;
  sessions: {
    exerciseId: string;
    plannedReps: number;
    completedReps: number;
    tolerance: Tolerance;
  }[];
}

/** Persist one rehab session (one row per exercise). Returns the count written. */
export async function logExerciseSessions(input: LogSessionInput): Promise<number> {
  if (!input.sessions.length) return 0;
  const db = getDb();
  await db.insert(exerciseSessionEvents).values(
    input.sessions.map((s) => ({
      petId: input.petId,
      exerciseId: s.exerciseId,
      plannedReps: s.plannedReps,
      completedReps: s.completedReps,
      tolerance: s.tolerance,
    })),
  );
  return input.sessions.length;
}
