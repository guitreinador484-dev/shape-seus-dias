import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/alunos")({
  component: () => <Outlet />,
  head: () => ({ meta: [{ title: "Alunos — Gui Treinador" }, { name: "description", content: "Gerencie alunos, planos e acessos." }, { property: "og:title", content: "Alunos — Gui Treinador" }, { property: "og:description", content: "Gerencie alunos, planos e acessos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});
