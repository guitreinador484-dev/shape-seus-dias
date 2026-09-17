import { createServerFn } from "@tanstack/react-start";

/**
 * Público (protegido pela referência da compra): gera o treino com IA
 * para o comprador depois do pagamento aprovado. Idempotente.
 */
export const generateAiPlanFn = createServerFn({ method: "POST" })
  .inputValidator((input: { reference: string }) => {
    if (!input?.reference || typeof input.reference !== "string") throw new Error("Referência inválida");
    return input;
  })
  .handler(async ({ data }) => {
    const { generateAiPlanForPurchase } = await import("./ai-plan.server");
    return generateAiPlanForPurchase(data.reference);
  });
