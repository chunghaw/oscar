import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { DEMO_PET_ID } from "@/lib/data/pets";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.ownerId) redirect("/");
  return <LoginScreen demoPetId={DEMO_PET_ID} />;
}
