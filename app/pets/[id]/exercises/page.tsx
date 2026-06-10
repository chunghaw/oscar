import { notFound } from "next/navigation";
import { ExerciseTrackScreen } from "@/components/exercise-track/ExerciseTrackScreen";
import { getPetView } from "@/lib/data/pets";

export default async function ExercisesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pet = await getPetView(id);
  if (!pet) notFound();
  return <ExerciseTrackScreen header={pet.header} view={pet.exerciseTrack} />;
}
