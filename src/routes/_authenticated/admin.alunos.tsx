import { createFileRoute } from "@tanstack/react-router";
import { AdminCategoryPlaceholder } from "@/components/admin/category-placeholder";

export const Route = createFileRoute("/_authenticated/admin/alunos")({
  component: () => (
    <AdminCategoryPlaceholder
      title="Alunos"
      description="Lista, busca e gestão de alunos online e presenciais. Liberar acessos, editar perfis e histórico."
      items={["Alunos online", "Alunos presenciais", "Liberar acesso às aulas", "Histórico de anamneses"]}
    />
  ),
});