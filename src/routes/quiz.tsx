import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/quiz")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Descubra seu plano de treino — Quiz Personal" },
      { name: "description", content: "Responda 5 perguntas e descubra o plano de treino ideal para o seu objetivo." },
      { property: "og:title", content: "Descubra seu plano de treino" },
      { property: "og:description", content: "Quiz rápido para montar o plano ideal para você." },
    ],
  }),
  component: QuizLayout,
});

function QuizLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  );
}