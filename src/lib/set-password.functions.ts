import { createServerFn } from "@tanstack/react-start";

/**
 * Define a senha de acesso do comprador direto pela referência da compra aprovada.
 * Evita depender do link de recuperação por e-mail (que expira / falha no preview).
 */
export const setPurchasePasswordFn = createServerFn({ method: "POST" })
  .inputValidator((input: { reference: string; password: string }) => {
    if (!input?.reference || typeof input.reference !== "string") throw new Error("Referência inválida");
    if (!input?.password || input.password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: purchase } = await supabaseAdmin
      .from("purchases")
      .select("status, customer_email, user_id")
      .eq("provider_reference", data.reference)
      .maybeSingle();

    if (!purchase || purchase.status !== "approved" || !purchase.customer_email) {
      return { ok: false as const, message: "Pagamento não confirmado para esta compra." };
    }

    const email = purchase.customer_email.trim().toLowerCase();
    let userId = purchase.user_id as string | null;

    if (!userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      userId = profile?.id ?? null;
    }

    if (!userId) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    }

    if (!userId) {
      return { ok: false as const, message: "Não encontramos a sua conta. Fale com o suporte." };
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: data.password,
      email_confirm: true,
    });

    if (error) {
      const msg = /weak|easy to guess/i.test(error.message)
        ? "Essa senha é muito comum. Escolha outra com letras, números e símbolos."
        : error.message;
      return { ok: false as const, message: msg };
    }

    return { ok: true as const, email };
  });

/** Só devolve o e-mail da compra aprovada, para mostrar na tela de criar senha. */
export const getPurchaseEmailFn = createServerFn({ method: "POST" })
  .inputValidator((input: { reference: string }) => {
    if (!input?.reference || typeof input.reference !== "string") throw new Error("Referência inválida");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: purchase } = await supabaseAdmin
      .from("purchases")
      .select("status, customer_email")
      .eq("provider_reference", data.reference)
      .maybeSingle();
    if (!purchase || purchase.status !== "approved" || !purchase.customer_email) {
      return { ok: false as const, email: null };
    }
    return { ok: true as const, email: purchase.customer_email.trim().toLowerCase() };
  });
