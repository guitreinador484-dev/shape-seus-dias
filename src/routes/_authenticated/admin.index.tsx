import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboardPanel } from "@/components/admin/admin-panels";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
  head: () => ({ meta: [{ title: "Dashboard — Gui Treinador" }, { name: "description", content: "Visão geral da operação, alunos e vendas." }, { property: "og:title", content: "Dashboard — Gui Treinador" }, { property: "og:description", content: "Visão geral da operação, alunos e vendas." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});

function AdminDashboard() {
  return <AdminDashboardPanel />;
}
