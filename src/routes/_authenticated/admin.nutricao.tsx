import { createFileRoute } from "@tanstack/react-router";
import { AdminNutritionPanel } from "@/components/admin/nutrition-panel";

export const Route = createFileRoute("/_authenticated/admin/nutricao")({
  component: AdminNutritionPanel,
  head: () => ({
    meta: [
      { title: "Nutrição dos alunos — Gui Treinador" },
      { name: "description", content: "Gerencie planos e o PDF alimentar liberado aos compradores." },
      { property: "og:title", content: "Nutrição dos alunos — Gui Treinador" },
      { property: "og:description", content: "Gerencie planos e o PDF alimentar liberado aos compradores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
