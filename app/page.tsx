import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LandingScreen } from "@/components/auth/LandingScreen";
import { DEMO_PET_ID } from "@/lib/data/pets";
import { mostRecentPetId } from "@/lib/data/ownership";

/**
 * Front door. Logged-in owners are routed straight to their pet (or onboarding if they
 * have none yet); logged-out visitors see the landing screen — which keeps the live
 * demo (Oscar) one tap away so judges can explore without an account.
 */
export default async function Home() {
  const session = await auth();
  if (session?.user?.ownerId) {
    const petId = await mostRecentPetId(session.user.ownerId);
    redirect(petId ? `/pets/${petId}` : "/onboarding");
  }
  return <LandingScreen demoPetId={DEMO_PET_ID} />;
}
