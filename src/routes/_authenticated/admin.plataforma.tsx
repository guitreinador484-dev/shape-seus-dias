import { createFileRoute } from "@tanstack/react-router";
import { AdminPlatformPanel } from "@/components/admin/admin-panels";

export const Route = createFileRoute("/_authenticated/admin/plataforma")({
  component: AdminPlatformPanel,
});