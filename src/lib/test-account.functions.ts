import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateTemporaryPassword } from "./temporary-password";

export const TEST_ACCOUNT_EMAIL = "aluno.teste@guitreinador.online";

const schema = z.object({
  tier: z.enum(["basico", "intermediario", "avancado"]),
  nivel: z.string().max(40),
  dias: z.string().max(10),
  tempo: z.string().max(20),
  objetivo: z.string().max(60),
  workout_type: z.string().max(30),
  limitacoes: z.string().max(300).optional(),
});

/** Admin: recria os treinos da conta de teste como se ela tivesse comprado agora. */
export const runTestWorkoutFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof schema>) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.from("user_roles").select("id").eq("user_id", context.userId).eq("role", "admin").limit(1);
    if (!isAdmin?.length) throw new Error("Apenas administradores podem usar a conta de teste.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateVideoTrainingGrid } = await import("./video-training.server");

    const password = generateTemporaryPassword(10);
    const { data: existing } = await supabaseAdmin.from("profiles").select("id").eq("email", TEST_ACCOUNT_EMAIL).maybeSingle();
    let userId = existing?.id ?? null;
    if (userId) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      if (error) throw new Error(`Não foi possível atualizar a conta de teste: ${error.message}`);
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({ email: TEST_ACCOUNT_EMAIL, password, email_confirm: true, user_metadata: { full_name: "Aluno Teste" } });
      if (error || !created.user) throw new Error(`Não foi possível criar a conta de teste: ${error?.message ?? ""}`);
      userId = created.user.id;
    }
    const now = new Date().toISOString();
    await supabaseAdmin.from("profiles").upsert({ id: userId, email: TEST_ACCOUNT_EMAIL, full_name: "Aluno Teste", is_active: true, has_class_access: true, welcome_completed_at: now, updated_at: now, referral_code: "TESTE" + userId.slice(0, 6).toUpperCase() });
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "online" });
    if (roleError && !/duplicate|unique/i.test(roleError.message)) throw new Error(roleError.message);

    const result = await generateVideoTrainingGrid({
      student_id: userId, days_count: Number(data.dias),
      level: data.nivel as "iniciante" | "intermediario" | "avancado",
      workout_type: data.workout_type as "tradicional" | "intercalado" | "circuito",
      emphasis: data.objetivo,
      planTierId: data.tier,
      answers: { nivel: data.nivel, dias: data.dias, tempo: data.tempo, objetivo: data.objetivo, workout_type: data.workout_type, limitacoes: data.limitacoes ?? "" },
    });
    return { ok: result.ok, plans: result.plansCount, pdf: result.pdfCount > 0, message: "Treino salvo com vídeos de execução.", email: TEST_ACCOUNT_EMAIL, password };
  });
