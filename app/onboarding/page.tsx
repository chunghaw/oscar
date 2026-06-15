import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.ownerId) redirect("/signup");
  return <OnboardingScreen />;
}
