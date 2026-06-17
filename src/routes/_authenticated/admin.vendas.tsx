import { createFileRoute } from "@tanstack/react-router";
import { AdminCategoryPlaceholder } from "@/components/admin/category-placeholder";

export const Route = createFileRoute("/_authenticated/admin/vendas")({
  component: () => (
    <AdminCategoryPlaceholder
      title="Vendas"
      description="Pedidos, status de pagamento e liberação de acesso aos alunos."
      items={["Pedidos recentes", "Pagamentos confirmados", "Reembolsos", "Cupons e preços"]}
    />
  ),
});