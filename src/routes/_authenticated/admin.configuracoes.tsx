import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsPanel } from "@/components/admin/admin-panels";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: AdminSettingsPanel,
  head: () => ({ meta: [{ title: "Configurações — Gui Treinador" }, { name: "description", content: "Configurações gerais da plataforma." }, { property: "og:title", content: "Configurações — Gui Treinador" }, { property: "og:description", content: "Configurações gerais da plataforma." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});