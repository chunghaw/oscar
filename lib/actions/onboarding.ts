"use server";

/**
 * Onboarding submit — creates the pet record for the SIGNED-IN owner and hands back its
 * id so the client can route into the first check-in. Captures only; non-clinical (see
 * onboarding-write). Requires a session: the pet is attributed to session.user.ownerId.
 */
import { auth } from "@/auth";
import { createPetFromOnboarding, type OnboardingInput } from "@/lib/data/onboarding-write";

export async function saveOnboarding(input: OnboardingInput): Promise<{ petId: string }> {
  const session = await auth();
  if (!session?.user?.ownerId) throw new Error("Not signed in");
  const petId = await createPetFromOnboarding(input, session.user.ownerId);
  return { petId };
}
