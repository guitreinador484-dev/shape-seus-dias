import { createFileRoute } from "@tanstack/react-router";

type MpPayment = {
  id?: number | string;
  status?: string;
  external_reference?: string | null;
  transaction_amount?: number;
  payer?: { email?: string };
};

async function handle(request: Request): Promise<Response> {
  const token = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!token) return new Response("not configured", { status: 500 });

  const url = new URL(request.url);
  let paymentId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  let type = url.searchParams.get("type") ?? url.searchParams.get("topic");

  if (request.method === "POST") {
    try {
      const body = (await request.json()) as { type?: string; action?: string; data?: { id?: string } };
      paymentId = body?.data?.id ?? paymentId;
      type = body?.type ?? (body?.action?.split(".")[0] ?? type);
    } catch {
      /* corpo vazio ou não-JSON */
    }
  }

  if (!paymentId || (type && !String(type).includes("payment"))) {
    return new Response("ignored", { status: 200 });
  }

  // Fonte de verdade: consultamos o pagamento direto na API do Mercado Pago.
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error("[mercadopago] payment lookup failed", res.status);
    return new Response("lookup failed", { status: 200 });
  }
  const payment = (await res.json()) as MpPayment;
  const reference = payment.external_reference;
  if (!reference) return new Response("no reference", { status: 200 });

  const status =
    payment.status === "approved"
      ? "approved"
      : payment.status === "rejected" || payment.status === "cancelled"
        ? "failed"
        : payment.status === "refunded" || payment.status === "charged_back"
          ? "refunded"
          : "pending";

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("purchases")
    .update({
      status,
      transaction_id: String(payment.id ?? paymentId),
      updated_at: new Date().toISOString(),
    })
    .eq("provider_reference", reference);

  if (error) {
    console.error("[mercadopago] update failed", error.message);
    return new Response("db error", { status: 500 });
  }

  if (status === "approved") {
    const { data: purchase } = await supabaseAdmin
      .from("purchases")
      .select("customer_email, customer_name, customer_whatsapp, user_id")
      .eq("provider_reference", reference)
      .maybeSingle();

    if (purchase?.customer_email && !purchase.user_id) {
      const { provisionAccess } = await import("@/lib/access.server");
      try {
        await provisionAccess({
          email: purchase.customer_email,
          name: purchase.customer_name,
          whatsapp: purchase.customer_whatsapp,
          reference,
          origin: new URL(request.url).origin,
        });
      } catch (e) {
        console.error("[mercadopago] falha ao liberar acesso", e);
      }
    }
  }

  return new Response("ok", { status: 200 });
}

export const Route = createFileRoute("/api/public/mercadopago/webhook")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
      GET: ({ request }) => handle(request),
    },
  },
});
