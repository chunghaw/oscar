import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignupScreen } from "@/components/auth/SignupScreen";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user?.ownerId) redirect("/");
  return <SignupScreen />;
}
