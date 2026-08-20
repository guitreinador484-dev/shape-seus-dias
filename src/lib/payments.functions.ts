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
      ...(origin.startsWith("https://") ? { auto_return: "approved" } : {}),
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

export const createPixPaymentFn = createServerFn({ method: "POST" })
  .inputValidator((input: CheckoutInput) => {
    if (!input || typeof input !== "object") throw new Error("Dados inválidos");
    if (!input.planId || !input.planName) throw new Error("Plano inválido");
    if (!input.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) throw new Error("Email inválido");
    const amount = parsePrice(input.price);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor do plano inválido");
    return { ...input, amount };
  })
  .handler(async ({ data }) => {
    const token = process.env["MERCADOPAGO_ACCESS_TOKEN"];
    if (!token) throw new Error("Mercado Pago não configurado");

    const request = getRequest();
    const origin = new URL(request.url).origin;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const externalReference = crypto.randomUUID();
    const [firstName, ...rest] = (data.name ?? "Cliente").trim().split(" ");

    const { error: insertError } = await supabaseAdmin.from("purchases").insert({
      amount: data.amount,
      status: "pending",
      provider: "mercadopago",
      provider_reference: externalReference,
      plan_id: data.planId,
      payment_method: "pix",
      customer_email: data.email ?? null,
      customer_name: data.name ?? null,
      customer_whatsapp: data.whatsapp ?? null,
    });
    if (insertError) throw new Error(`Falha ao registrar compra: ${insertError.message}`);

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": externalReference,
      },
      body: JSON.stringify({
        transaction_amount: Number(data.amount.toFixed(2)),
        description: data.planName,
        payment_method_id: "pix",
        external_reference: externalReference,
        notification_url: `${origin}/api/public/mercadopago/webhook`,
        payer: {
          email: data.email,
          first_name: firstName || "Cliente",
          last_name: rest.join(" ") || "Shape",
        },
      }),
    });

    const json = (await res.json()) as {
      id?: number | string;
      status?: string;
      message?: string;
      point_of_interaction?: {
        transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string };
      };
    };

    const tx = json.point_of_interaction?.transaction_data;
    if (!res.ok || !tx?.qr_code) {
      console.error("[mercadopago] pix error", res.status, json);
      throw new Error(json.message ?? "Falha ao gerar o PIX. Verifique se a chave PIX está ativa na conta Mercado Pago.");
    }

    await supabaseAdmin
      .from("purchases")
      .update({ transaction_id: String(json.id ?? "") })
      .eq("provider_reference", externalReference);

    return {
      reference: externalReference,
      qrCode: tx.qr_code,
      qrCodeBase64: tx.qr_code_base64 ?? null,
      ticketUrl: tx.ticket_url ?? null,
      amount: data.amount,
    };
  });

export const getPaymentStatusFn = createServerFn({ method: "POST" })
  .inputValidator((input: { reference: string }) => {
    if (!input?.reference || typeof input.reference !== "string") throw new Error("Referência inválida");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("purchases")
      .select("status")
      .eq("provider_reference", data.reference)
      .maybeSingle();

    let status = row?.status ?? "pending";

    // Fallback: consulta direta na API caso o webhook ainda não tenha chegado.
    if (status === "pending") {
      const token = process.env["MERCADOPAGO_ACCESS_TOKEN"];
      if (token) {
        const res = await fetch(
          `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(data.reference)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          const json = (await res.json()) as { results?: { status?: string }[] };
          const mp = json.results?.[0]?.status;
          if (mp === "approved") status = "approved";
          else if (mp === "rejected" || mp === "cancelled") status = "failed";
          if (status !== "pending") {
            await supabaseAdmin
              .from("purchases")
              .update({ status, updated_at: new Date().toISOString() })
              .eq("provider_reference", data.reference);
          }
        }
      }
    }

    return { status };
  });
