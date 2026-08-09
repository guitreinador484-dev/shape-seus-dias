import { createFileRoute } from "@tanstack/react-router";
import { AdminEngagementPanel } from "@/components/admin/engagement-panel";

export const Route = createFileRoute("/_authenticated/admin/engajamento")({
  component: AdminEngagementPanel,
});
