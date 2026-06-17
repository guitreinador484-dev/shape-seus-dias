import { createFileRoute } from "@tanstack/react-router";
import { AdminCategoryPlaceholder } from "@/components/admin/category-placeholder";

export const Route = createFileRoute("/_authenticated/admin/quiz")({
  component: () => (
    <AdminCategoryPlaceholder
      title="Quiz / Anamnese"
      description="Edite as perguntas do quiz e veja as respostas enviadas pelos alunos."
      items={["Perguntas do quiz", "Respostas dos alunos", "Anamneses recebidas", "Exportar dados"]}
    />
  ),
});