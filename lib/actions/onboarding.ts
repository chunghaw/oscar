"use server";

/**
 * Onboarding submit — creates the pet record and hands back its id so the client
 * can route into the first check-in. Captures only; non-clinical (see onboarding-write).
 */
import { createPetFromOnboarding, type OnboardingInput } from "@/lib/data/onboarding-write";

export async function saveOnboarding(input: OnboardingInput): Promise<{ petId: string }> {
  const petId = await createPetFromOnboarding(input);
  return { petId };
}
