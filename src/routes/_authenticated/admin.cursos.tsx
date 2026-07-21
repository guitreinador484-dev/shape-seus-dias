import { createFileRoute } from "@tanstack/react-router";
import { AdminCoursesListPanel } from "@/components/admin/courses-panel";

export const Route = createFileRoute("/_authenticated/admin/cursos")({
  component: AdminCoursesListPanel,
});