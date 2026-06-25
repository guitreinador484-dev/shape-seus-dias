import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { QuizConfig } from "@/lib/quiz-store";

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

/** Publishes (or updates) a quiz so it becomes reachable via /quiz/:slug on any device. */
export const publishQuizFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { quiz: QuizConfig }) => {
    if (!input?.quiz?.id || !input?.quiz?.slug) throw new Error("Quiz inválido");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const section = `quiz:${data.quiz.id}`;
    const { error } = await supabaseAdmin
      .from("quiz_config")
      .upsert(
        { section, content: data.quiz as unknown as Record<string, unknown> },
        { onConflict: "section" },
      );
    if (error) throw new Error(`Falha ao publicar: ${error.message}`);
    return { ok: true as const };
  });

/** Removes a published quiz from the backend. */
export const unpublishQuizFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("ID obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const section = `quiz:${data.id}`;
    const { error } = await supabaseAdmin.from("quiz_config").delete().eq("section", section);
    if (error) throw new Error(`Falha ao remover: ${error.message}`);
    return { ok: true as const };
  });

/** Public read of a published quiz by slug. No auth required. */
export async function fetchPublicQuizBySlug(slug: string): Promise<QuizConfig | null> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase
    .from("quiz_config")
    .select("content")
    .like("section", "quiz:%")
    .filter("content->>slug", "eq", slug)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[quiz] fetchPublicQuizBySlug", error);
    return null;
  }
  return (data?.content as unknown as QuizConfig) ?? null;
}