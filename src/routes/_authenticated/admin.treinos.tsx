import { createFileRoute } from "@tanstack/react-router";
import { AdminTrainingPanel } from "@/components/admin/admin-panels";

export const Route = createFileRoute("/_authenticated/admin/treinos")({
  component: AdminTrainingPanel,
});