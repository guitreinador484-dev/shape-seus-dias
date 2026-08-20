import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

type CheckoutInput = {
  planId: string;
  planName: string;
  price: string | number;
  method?: "pix" | "card";
  name?: string;
  email?: string;
  whatsapp?: string;
};

function parsePrice(price: string | number): number {
  if (typeof price === "number") return price;
  const cleaned = price.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : NaN;
}

export const createMercadoPagoCheckoutFn = createServerFn({ method: "POST" })
  .inputValidator((input: CheckoutInput) => {
    if (!input || typeof input !== "object") throw new Error("Dados inválidos");
    if (!input.planId || !input.planName) throw new Error("Plano inválido");
    const amount = parsePrice(input.price);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor do plano inválido");
    if (input.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) throw new Error("Email inválido");
    return { ...input, amount };
  })
  .handler(async ({ data }) => {
    const token = process.env["MERCADOPAGO_ACCESS_TOKEN"];
    if (!token) throw new Error("Mercado Pago não configurado");

    const request = getRequest();
    const origin = new URL(request.url).origin;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const externalReference = crypto.randomUUID();

    const { error: insertError } = await supabaseAdmin.from("purchases").insert({
      amount: data.amount,
      status: "pending",
      provider: "mercadopago",
      provider_reference: externalReference,
      plan_id: data.planId,
      payment_method: data.method ?? null,
      customer_email: data.email ?? null,
      customer_name: data.name ?? null,
      customer_whatsapp: data.whatsapp ?? null,
    });
    if (insertError) throw new Error(`Falha ao registrar compra: ${insertError.message}`);

    const body = {
      items: [
        {
          id: data.planId,
          title: data.planName,
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number(data.amount.toFixed(2)),
        },
      ],
      payer: data.email ? { email: data.email, name: data.name ?? undefined } : undefined,
      external_reference: externalReference,
      notification_url: `${origin}/api/public/mercadopago/webhook`,
      back_urls: {
        success: `${origin}/funil?pagamento=sucesso`,
        pending: `${origin}/funil?pagamento=pendente`,
        failure: `${origin}/funil?pagamento=falhou`,
      },
      auto_return: "approved",
      statement_descriptor: "SHAPE SEUS DIAS",
      payment_methods:
        data.method === "pix"
          ? { excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }] }
          : undefined,
    };

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": externalReference,
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as { id?: string; init_point?: string; message?: string };
    if (!res.ok || !json.init_point) {
      console.error("[mercadopago] preference error", res.status, json);
      throw new Error(json.message ?? "Falha ao criar o checkout do Mercado Pago");
    }

    await supabaseAdmin
      .from("purchases")
      .update({ transaction_id: json.id ?? null })
      .eq("provider_reference", externalReference);

    return { checkoutUrl: json.init_point, reference: externalReference };
  });
