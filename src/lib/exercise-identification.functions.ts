import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const identifyExerciseVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ frames: z.array(z.string().max(350000).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/)).min(1).max(4) }).parse(input))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (role.error || !role.data) throw new Error("Somente o administrador pode analisar vídeos.");
    const block = await context.supabase.from("quiz_config").select("content").eq("section", "exercise_ai_access").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (block.error) throw new Error("Não foi possível verificar a disponibilidade da análise.");
    const content = block.data?.content;
    if (content && typeof content === "object" && !Array.isArray(content) && typeof content['message'] === "string") return { ok: false as const, error: content['message'] };
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) return { ok: false as const, error: "A identificação por IA não está configurada." };
    const catalog = await context.supabase.from("exercises").select("id,name").order("name");
    if (catalog.error) throw new Error("Não foi possível consultar os exercícios.");
    const { identifyExercise } = await import("./exercise-ai/identify.server");
    try {
      const result = await identifyExercise(apiKey, data.frames, catalog.data ?? [], async (message) => {
        const saved = await context.supabase.from("quiz_config").insert({ section: "exercise_ai_access", content: { message } });
        if (saved.error) throw new Error(message);
      });
      const existing = catalog.data?.find((exercise) => exercise.id === result.existingExerciseId);
      return { ok: true as const, result: { ...result, existingExerciseId: existing?.id ?? null, name: existing?.name ?? result.name } };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "Não foi possível identificar o exercício." };
    }
  });