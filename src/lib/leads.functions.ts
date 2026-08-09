import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

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
      status: data.status ?? "qualificado",
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
