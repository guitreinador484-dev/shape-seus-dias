import { createFileRoute } from "@tanstack/react-router";
import { AdminCategoryPlaceholder } from "@/components/admin/category-placeholder";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: () => (
    <AdminCategoryPlaceholder
      title="Configurações"
      description="Preferências gerais do painel, marca e integrações."
      items={["Dados do personal", "Marca e identidade", "Integrações (pagamentos, e-mail)", "Permissões de admins"]}
    />
  ),
});