import { createFileRoute } from "@tanstack/react-router";
import { AdminLessonsPanel } from "@/components/admin/admin-panels";

export const Route = createFileRoute("/_authenticated/admin/aulas")({
  component: AdminLessonsPanel,
  head: () => ({ meta: [{ title: "Aulas em vídeo — Gui Treinador" }, { name: "description", content: "Gerencie as aulas em vídeo liberadas aos alunos." }, { property: "og:title", content: "Aulas em vídeo — Gui Treinador" }, { property: "og:description", content: "Gerencie as aulas em vídeo liberadas aos alunos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});