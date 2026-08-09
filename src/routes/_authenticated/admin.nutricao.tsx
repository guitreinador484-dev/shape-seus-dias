import { createFileRoute } from "@tanstack/react-router";
import { AdminNutritionPanel } from "@/components/admin/nutrition-panel";

export const Route = createFileRoute("/_authenticated/admin/nutricao")({
  component: AdminNutritionPanel,
});
