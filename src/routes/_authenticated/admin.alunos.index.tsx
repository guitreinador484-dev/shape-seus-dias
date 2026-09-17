import { createFileRoute } from "@tanstack/react-router";
import { AdminStudentsPanel } from "@/components/admin/students-panel";

export const Route = createFileRoute("/_authenticated/admin/alunos/")({
  component: AdminStudentsPanel,
});
