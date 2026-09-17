import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ensure-selftest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const uid = new URL(request.url).searchParams.get("uid") ?? "";
        const { ensureAiPlanForUser } = await import("@/lib/ai-plan.server");
        return Response.json(await ensureAiPlanForUser(uid));
      },
    },
  },
});
