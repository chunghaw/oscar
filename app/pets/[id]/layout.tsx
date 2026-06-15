import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DEMO_PET_ID } from "@/lib/data/pets";
import { ownerOwnsPet } from "@/lib/data/ownership";

/**
 * Ownership guard for every pet sub-route (dashboard, check-in, companion, media,
 * recall, brief, exercises, vet-contact). The demo pet (Oscar) stays public so judges
 * can explore without an account; every other pet requires a session that owns it.
 *
 * Non-clinical: this is pure relational authorization — it reads no health data.
 */
export default async function PetLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Public demo — anyone can explore Oscar.
  if (id === DEMO_PET_ID) return <>{children}</>;

  const session = await auth();
  if (!session?.user?.ownerId) redirect("/login");

  const owns = await ownerOwnsPet(session.user.ownerId, id);
  if (!owns) redirect("/login");

  return <>{children}</>;
}
