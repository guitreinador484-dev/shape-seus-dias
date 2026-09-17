import { createFileRoute } from "@tanstack/react-router";
import { AdminOrderBumpPanel } from "@/components/admin/order-bump-panel";

export const Route = createFileRoute("/_authenticated/admin/order-bump")({
  component: AdminOrderBumpPanel,
});
