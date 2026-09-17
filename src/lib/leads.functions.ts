import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

export const LEAD_STAGES = ["lead", "contato", "interessado", "oferta", "compra", "aluno"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

type SubmitLeadInput = {
  source: "funil";
  name?: string;
  email?: string;
  whatsapp?: string;
  score?: number;
  profile?: string;
  status?: string;
  planId?: string;
  answers?: Record<string, unknown>;
};

/**
 * Public: salva um lead capturado no funil. Sem autenticação —
 * chamado das páginas públicas de conversão. Escrita via service role.
 */
export const submitLeadFn = createServerFn({ method: "POST" })
  .inputValidator((input: SubmitLeadInput) => {
    if (!input || typeof input !== "object") throw new Error("Dados inválidos");
    if (input.source !== "funil") throw new Error("Origem inválida");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const answers = (data.answers ?? {}) as Json;
    const { error } = await supabaseAdmin.from("leads").insert({
      source: data.source,
      name: data.name ?? null,
      email: data.email ?? null,
      whatsapp: data.whatsapp ?? null,
      score: data.score ?? null,
      profile: data.profile ?? null,
      status: LEAD_STAGES.includes(data.status as LeadStage) ? data.status : "lead",
      plan_id: data.planId ?? null,
      answers,
    });
    if (error) throw new Error(`Falha ao salvar lead: ${error.message}`);
    return { ok: true as const };
  });

/**
 * Admin-only: lista os leads salvos no servidor, mais recentes primeiro.
 */
export const listLeadsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: roles, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleErr) throw new Error(`Falha ao verificar permissão: ${roleErr.message}`);
    if (!roles?.some((r) => r.role === "admin")) throw new Error("Acesso negado: apenas administradores");

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(`Falha ao carregar leads: ${error.message}`);
    return { leads: data ?? [] };
  });

export const updateLeadStageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leadId: string; stage: LeadStage; origin: string }) => {
    if (!input?.leadId || !LEAD_STAGES.includes(input.stage)) throw new Error("Etapa inválida");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Acesso negado: apenas administradores");

    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", data.leadId)
      .single();
    if (leadError || !lead) throw new Error("Contato não encontrado");

    let purchaseId: string | null = lead.purchase_id;
    let studentId: string | null = lead.student_id;
    const email = lead.email?.trim().toLowerCase();

    if (data.stage === "compra" || data.stage === "aluno") {
      if (!email) throw new Error("Adicione um e-mail antes de mover para esta etapa.");
      const { data: purchase } = await supabaseAdmin
        .from("purchases")
        .select("id, provider_reference, status, customer_name, customer_whatsapp")
        .ilike("customer_email", email)
        .in("status", ["approved", "paid"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!purchase) throw new Error("Nenhuma compra aprovada foi encontrada para este e-mail.");
      purchaseId = purchase.id;

      if (data.stage === "aluno") {
        const { provisionAccess } = await import("@/lib/access.server");
        const provisioned = await provisionAccess({
          email,
          name: lead.name ?? purchase.customer_name,
          whatsapp: lead.whatsapp ?? purchase.customer_whatsapp,
          origin: data.origin,
          reference: purchase.provider_reference,
        });
        if (!provisioned.ok) throw new Error(provisioned.message ?? "Não foi possível criar o acesso.");
        const { data: profile } = await supabaseAdmin.from("profiles").select("id").eq("email", email).maybeSingle();
        studentId = profile?.id ?? null;
      }
    }

    const { error } = await supabaseAdmin
      .from("leads")
      .update({
        status: data.stage,
        stage_updated_at: new Date().toISOString(),
        purchase_id: purchaseId,
        student_id: studentId,
      })
      .eq("id", data.leadId);
    if (error) throw new Error(`Não foi possível mover o contato: ${error.message}`);
    return { ok: true as const, studentId };
  });
