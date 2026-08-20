// Server-only: cria a conta de acesso do cliente após o pagamento aprovado
// e dispara o e-mail para ele definir a senha.

export type ProvisionInput = {
  email: string;
  name?: string | null;
  whatsapp?: string | null;
  origin: string;
  reference?: string | null;
};

export type ProvisionResult = {
  ok: boolean;
  created: boolean;
  emailSent: boolean;
  message?: string;
};

function makeReferralCode(email: string): string {
  const base = email.split("@")[0]?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toLowerCase() || "aluno";
  return `${base}${Math.random().toString(36).slice(2, 6)}`;
}

export async function provisionAccess(input: ProvisionInput): Promise<ProvisionResult> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, created: false, emailSent: false, message: "Email inválido" };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let userId: string | null = null;
  let created = false;

  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile?.id) {
    userId = existingProfile.id;
  } else {
    const tempPassword = `${crypto.randomUUID()}Aa1!`;
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: input.name ?? null,
        whatsapp: input.whatsapp ?? null,
      },
    });
    if (error && !/already|exists|registered/i.test(error.message)) {
      console.error("[access] falha ao criar usuário", error.message);
      return { ok: false, created: false, emailSent: false, message: error.message };
    }
    userId = data?.user?.id ?? null;
    created = Boolean(userId);

    if (!userId) {
      // usuário já existe no auth, mas sem profile — procura na lista
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    }
  }

  if (!userId) {
    return { ok: false, created: false, emailSent: false, message: "Não foi possível identificar a conta" };
  }

  // Garante o profile com acesso liberado
  const { data: profileRow } = await supabaseAdmin
    .from("profiles")
    .select("id, referral_code")
    .eq("id", userId)
    .maybeSingle();

  if (profileRow) {
    await supabaseAdmin
      .from("profiles")
      .update({
        email,
        full_name: input.name ?? undefined,
        whatsapp: input.whatsapp ?? undefined,
        has_class_access: true,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  } else {
    await supabaseAdmin.from("profiles").insert({
      id: userId,
      email,
      full_name: input.name ?? null,
      whatsapp: input.whatsapp ?? null,
      has_class_access: true,
      is_active: true,
      referral_code: makeReferralCode(email),
    });
  }

  // Papel de aluno online (ignora se já existir)
  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: userId, role: "online" });
  if (roleError && !/duplicate|unique/i.test(roleError.message)) {
    console.error("[access] falha ao atribuir papel", roleError.message);
  }

  // Vincula a compra ao usuário
  if (input.reference) {
    await supabaseAdmin
      .from("purchases")
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .eq("provider_reference", input.reference);
  }

  // Envia o e-mail para o cliente definir a senha de acesso
  let emailSent = false;
  const { error: mailError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: `${input.origin}/reset-password`,
  });
  if (mailError) {
    console.error("[access] falha ao enviar email de acesso", mailError.message);
  } else {
    emailSent = true;
  }

  return { ok: true, created, emailSent };
}
