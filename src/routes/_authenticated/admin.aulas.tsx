import { createFileRoute } from "@tanstack/react-router";
import { AdminLessonsPanel } from "@/components/admin/admin-panels";

export const Route = createFileRoute("/_authenticated/admin/aulas")({
  component: AdminLessonsPanel,
});