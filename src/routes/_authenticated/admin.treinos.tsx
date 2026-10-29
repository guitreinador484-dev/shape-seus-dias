import { createFileRoute } from "@tanstack/react-router";
import { AdminTrainingPanel } from "@/components/admin/admin-panels";
import { TestWorkoutCard } from "@/components/admin/test-workout-card";

function TrainingPage() {
  return <div className="space-y-6"><AdminTrainingPanel /><TestWorkoutCard /></div>;
}

export const Route = createFileRoute("/_authenticated/admin/treinos")({
  component: TrainingPage,
  head: () => ({ meta: [{ title: "Treinos — Gui Treinador" }, { name: "description", content: "Crie, organize e acompanhe os treinos dos alunos." }, { property: "og:title", content: "Treinos — Gui Treinador" }, { property: "og:description", content: "Crie, organize e acompanhe os treinos dos alunos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});