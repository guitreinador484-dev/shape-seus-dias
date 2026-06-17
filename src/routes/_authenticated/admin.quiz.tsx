import { createFileRoute } from "@tanstack/react-router";
import { AdminQuizPanel } from "@/components/admin/admin-panels";

export const Route = createFileRoute("/_authenticated/admin/quiz")({
  component: AdminQuizPanel,
});