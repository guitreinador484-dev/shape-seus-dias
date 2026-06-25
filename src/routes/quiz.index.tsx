import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/quiz/")({
  head: () => ({
    meta: [
      { title: "Descubra seu plano de treino — Quiz Personal" },
      { name: "description", content: "Responda 5 perguntas e descubra o plano de treino ideal para o seu objetivo." },
      { property: "og:title", content: "Descubra seu plano de treino" },
      { property: "og:description", content: "Quiz rápido para montar o plano ideal para você." },
    ],
  }),
  component: QuizPlaceholder,
});

function QuizPlaceholder() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-5xl">QUIZ</h1>
        <p className="text-muted-foreground mt-4">
          O quiz interativo será construído na Fase 3, lendo o conteúdo da tabela <code className="text-primary">quiz_config</code>.
        </p>
      </div>
    </div>
  );
}