import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ai-plan-selftest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ref = new URL(request.url).searchParams.get("ref") ?? "";
        const { generateAiPlanForPurchase } = await import("@/lib/ai-plan.server");
        return Response.json(await generateAiPlanForPurchase(ref));
      },
    },
  },
});
