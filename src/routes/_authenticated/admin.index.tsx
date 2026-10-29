import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboardPanel } from "@/components/admin/admin-panels";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
  head: () => ({ meta: [{ title: "Visão geral — Gui Treinador" }, { name: "description", content: "Visão geral da operação, alunos e vendas." }, { property: "og:title", content: "Visão geral — Gui Treinador" }, { property: "og:description", content: "Visão geral da operação, alunos e vendas." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});

function AdminDashboard() {
  return <AdminDashboardPanel />;
}
