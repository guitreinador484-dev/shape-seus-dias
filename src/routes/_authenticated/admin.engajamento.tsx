import { createFileRoute } from "@tanstack/react-router";
import { AdminEngagementPanel } from "@/components/admin/engagement-panel";

export const Route = createFileRoute("/_authenticated/admin/engajamento")({
  component: AdminEngagementPanel,
  head: () => ({ meta: [{ title: "Engajamento — Gui Treinador" }, { name: "description", content: "Acompanhe frequência, consistência e alunos que precisam de atenção." }, { property: "og:title", content: "Engajamento — Gui Treinador" }, { property: "og:description", content: "Acompanhe frequência, consistência e alunos que precisam de atenção." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});
