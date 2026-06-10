"use server";

/**
 * Log a rehab session — the write side of the exercise track. Persists the session
 * rows then revalidates the track + dashboard (adherence and the progression nudge
 * recompute from the new sessions). Non-clinical: records adherence only.
 */
import { revalidatePath } from "next/cache";
import { logExerciseSessions, type LogSessionInput } from "@/lib/data/exercise-write";

export async function logSession(input: LogSessionInput): Promise<{ ok: true; count: number }> {
  const count = await logExerciseSessions(input);
  revalidatePath(`/pets/${input.petId}/exercises`);
  revalidatePath(`/pets/${input.petId}`);
  return { ok: true, count };
}
