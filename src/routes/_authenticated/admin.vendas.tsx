import { createFileRoute } from "@tanstack/react-router";
import { AdminSalesPanel } from "@/components/admin/admin-panels";

export const Route = createFileRoute("/_authenticated/admin/vendas")({
  component: AdminSalesPanel,
});