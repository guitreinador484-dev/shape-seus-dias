import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** O aluno abriu a plataforma sem treino: gera na hora a partir da compra aprovada dele. */
export const ensureMyPlanFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { ensureAiPlanForUser } = await import("./ai-plan.server");
    return ensureAiPlanForUser(context.userId);
  });

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
