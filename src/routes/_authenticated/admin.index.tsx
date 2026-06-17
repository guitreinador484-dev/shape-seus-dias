import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboardPanel, AdminHomeCards } from "@/components/admin/admin-panels";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <div className="space-y-8">
      <AdminDashboardPanel />
      <div className="max-w-7xl mx-auto">
      <h2 className="font-display text-3xl mb-2">Painel do administrador</h2>
        <p className="text-muted-foreground mb-8">Escolha uma categoria para gerenciar.</p>
        <AdminHomeCards />
      </div>
    </div>
  );
}