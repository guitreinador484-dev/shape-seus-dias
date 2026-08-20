import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const provisionAccessFn = createServerFn({ method: "POST" })
  .inputValidator((input: { reference: string }) => {
    if (!input?.reference || typeof input.reference !== "string") throw new Error("Referência inválida");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: purchase } = await supabaseAdmin
      .from("purchases")
      .select("status, customer_email, customer_name, customer_whatsapp")
      .eq("provider_reference", data.reference)
      .maybeSingle();

    if (!purchase || purchase.status !== "approved" || !purchase.customer_email) {
      return { ok: false, created: false, emailSent: false, message: "Pagamento não confirmado" };
    }

    const { provisionAccess } = await import("./access.server");
    const origin = new URL(getRequest().url).origin;
    return provisionAccess({
      email: purchase.customer_email,
      name: purchase.customer_name,
      whatsapp: purchase.customer_whatsapp,
      reference: data.reference,
      origin,
    });
  });
