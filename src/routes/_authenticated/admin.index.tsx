import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboardPanel } from "@/components/admin/admin-panels";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  return <AdminDashboardPanel />;
}
