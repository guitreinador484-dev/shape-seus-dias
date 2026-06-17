import { createFileRoute } from "@tanstack/react-router";
import { AdminCategoryPlaceholder } from "@/components/admin/category-placeholder";

export const Route = createFileRoute("/_authenticated/admin/treinos")({
  component: () => (
    <AdminCategoryPlaceholder
      title="Treinos"
      description="Crie planos de treino e prescreva exercícios para cada aluno."
      items={["Modelos de treino", "Plano por aluno", "Biblioteca de exercícios", "Séries, repetições e cargas"]}
    />
  ),
});