import { createFileRoute } from "@tanstack/react-router";
import { AdminStudentsPanel } from "@/components/admin/admin-panels";

export const Route = createFileRoute("/_authenticated/admin/alunos")({
  component: AdminStudentsPanel,
});