import { createFileRoute } from "@tanstack/react-router";
import { FeedbackPanel } from "@/components/admin/feedback-panel";

export const Route = createFileRoute("/_authenticated/admin/feedbacks")({
  component: FeedbackPanel,
  head: () => ({ meta: [{ title: "Feedbacks — Gui Treinador" }, { name: "description", content: "Críticas e sugestões enviadas pelas clientes." }, { property: "og:title", content: "Feedbacks — Gui Treinador" }, { property: "og:description", content: "Críticas e sugestões enviadas pelas clientes." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});