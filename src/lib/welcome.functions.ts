import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getWelcomeStateFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error: profileError } = await context.supabase.from("profiles").select("welcome_purchase_id, welcome_completed_at").eq("id", context.userId).single();
    if (profileError) throw new Error("Não foi possível verificar as boas-vindas.");
    const { data: purchase } = await context.supabase.from("purchases").select("id, created_at").eq("user_id", context.userId).in("status", ["approved", "paid"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!purchase) return { show: false as const, purchaseId: null, videoUrl: "", title: "", text: "" };
    // A conclusão pertence à conta, não à compra mais recente. Assim, uma nova
    // compra ou adicional não faz o vídeo de primeiro acesso aparecer novamente.
    const alreadyCompleted = Boolean(profile.welcome_completed_at);
    if (alreadyCompleted) return { show: false as const, purchaseId: purchase.id, videoUrl: "", title: "", text: "" };
    const { data: config } = await context.supabase.from("quiz_config").select("content").eq("section", "configuracoes").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    const content = config?.content && typeof config.content === "object" && !Array.isArray(config.content) ? config.content as Record<string, unknown> : {};
    return {
      show: true as const,
      purchaseId: purchase.id,
      videoUrl: typeof content.welcome_video_url === "string" ? content.welcome_video_url : "",
      title: typeof content.welcome_video_title === "string" ? content.welcome_video_title : "Pagamento confirmado! 🎉",
      text: typeof content.welcome_video_text === "string" ? content.welcome_video_text : "Agora começa oficialmente sua jornada.",
    };
  });

export const completeWelcomeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { purchaseId: string }) => {
    if (!input?.purchaseId || typeof input.purchaseId !== "string") throw new Error("Compra inválida");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: purchase } = await context.supabase.from("purchases").select("id").eq("id", data.purchaseId).eq("user_id", context.userId).in("status", ["approved", "paid"]).maybeSingle();
    if (!purchase) throw new Error("Pagamento aprovado não encontrado.");
    const { error } = await context.supabase.from("profiles").update({ welcome_purchase_id: purchase.id, welcome_completed_at: new Date().toISOString() }).eq("id", context.userId);
    if (error) throw new Error("Não foi possível concluir as boas-vindas.");
    return { ok: true as const };
  });