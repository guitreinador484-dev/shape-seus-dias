import { createFileRoute } from "@tanstack/react-router";
import { AdminOrderBumpPanel } from "@/components/admin/order-bump-panel";

export const Route = createFileRoute("/_authenticated/admin/order-bump")({
  component: AdminOrderBumpPanel,
  head: () => ({ meta: [{ title: "Ofertas extras — Gui Treinador" }, { name: "description", content: "Configure ofertas adicionais para o checkout." }, { property: "og:title", content: "Ofertas extras — Gui Treinador" }, { property: "og:description", content: "Configure ofertas adicionais para o checkout." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});
