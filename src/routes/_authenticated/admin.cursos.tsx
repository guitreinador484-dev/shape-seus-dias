import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { AdminCoursesListPanel } from "@/components/admin/courses-panel";

export const Route = createFileRoute("/_authenticated/admin/cursos")({
  component: AdminCoursesRoute,
});

function AdminCoursesRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/admin/cursos") return <Outlet />;
  return <AdminCoursesListPanel />;
}