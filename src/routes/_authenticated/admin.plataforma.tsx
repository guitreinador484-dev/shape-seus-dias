import { createFileRoute } from "@tanstack/react-router";
import { AdminPlatformPanel } from "@/components/admin/admin-panels";

export const Route = createFileRoute("/_authenticated/admin/plataforma")({
  component: AdminPlatformPanel,
  head: () => ({ meta: [{ title: "Plataforma do aluno — Gui Treinador" }, { name: "description", content: "Configure a apresentação e os recursos da área do aluno." }, { property: "og:title", content: "Plataforma do aluno — Gui Treinador" }, { property: "og:description", content: "Configure a apresentação e os recursos da área do aluno." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});