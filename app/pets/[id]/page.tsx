import { notFound } from "next/navigation";
import { DashboardScreen } from "@/components/dashboard/DashboardScreen";
import { getPetView, DEMO_PET_ID } from "@/lib/data/pets";

export default async function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pet = await getPetView(id);
  if (!pet) notFound();
  return <DashboardScreen header={pet.header} view={pet.dashboard} isDemo={id === DEMO_PET_ID} />;
}
