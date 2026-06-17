import { createFileRoute } from "@tanstack/react-router";
import { AdminCategoryPlaceholder } from "@/components/admin/category-placeholder";

export const Route = createFileRoute("/_authenticated/admin/aulas")({
  component: () => (
    <AdminCategoryPlaceholder
      title="Aulas em vídeo"
      description="Biblioteca de aulas, categorias e organização do conteúdo dos alunos online."
      items={["Upload e edição de aulas", "Categorias e módulos", "Ordem de exibição", "Liberação por plano"]}
    />
  ),
});