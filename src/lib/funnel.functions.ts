import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { FunnelConfig } from "@/lib/funnel-store";

const SECTION = "funnel:default";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .limit(1);
  if (error) throw new Error(`Falha ao verificar permissão: ${error.message}`);
  if (!data?.length) throw new Error("Acesso negado: apenas administradores");
}

export const publishFunnelFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { config: FunnelConfig }) => {
    if (!input?.config?.slug) throw new Error("Config inválida");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const content = JSON.parse(JSON.stringify(data.config));
    const { error } = await supabaseAdmin
      .from("quiz_config")
      .upsert({ section: SECTION, content }, { onConflict: "section" });
    if (error) throw new Error(`Falha ao publicar: ${error.message}`);
    return { ok: true as const };
  });

export async function fetchPublicFunnel(): Promise<FunnelConfig | null> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase
    .from("quiz_config")
    .select("content")
    .eq("section", SECTION)
    .maybeSingle();
  if (error) {
    console.error("[funnel] fetch", error);
    return null;
  }
  return (data?.content as unknown as FunnelConfig) ?? null;
}
