import { createFileRoute } from "@tanstack/react-router";
import { AdminSalesPanel } from "@/components/admin/admin-panels";

export const Route = createFileRoute("/_authenticated/admin/vendas")({
  component: AdminSalesPanel,
  head: () => ({ meta: [{ title: "Vendas — Gui Treinador" }, { name: "description", content: "Acompanhe pagamentos, receita e novos clientes." }, { property: "og:title", content: "Vendas — Gui Treinador" }, { property: "og:description", content: "Acompanhe pagamentos, receita e novos clientes." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});