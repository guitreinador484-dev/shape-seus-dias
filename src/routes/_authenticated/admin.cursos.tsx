import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { AdminCoursesListPanel } from "@/components/admin/courses-panel";

export const Route = createFileRoute("/_authenticated/admin/cursos")({
  component: AdminCoursesRoute,
  head: () => ({ meta: [{ title: "Cursos — Gui Treinador" }, { name: "description", content: "Organize cursos e conteúdos da área de membros." }, { property: "og:title", content: "Cursos — Gui Treinador" }, { property: "og:description", content: "Organize cursos e conteúdos da área de membros." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});

function AdminCoursesRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/admin/cursos") return <Outlet />;
  return <AdminCoursesListPanel />;
}