import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsPanel } from "@/components/admin/admin-panels";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: AdminSettingsPanel,
});