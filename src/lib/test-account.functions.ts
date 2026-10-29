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
    const { buildAndSavePlans } = await import("./ai-plan.server");
    const { resolvePlanTier } = await import("./plan-tiers");

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

    // Apaga os treinos anteriores da conta de teste (somente dela).
    const { data: oldPlans } = await supabaseAdmin.from("student_plans").select("id").eq("student_id", userId);
    const oldIds = (oldPlans ?? []).map((p) => p.id);
    if (oldIds.length) {
      await supabaseAdmin.from("workout_pdfs").delete().in("plan_id", oldIds);
      await supabaseAdmin.from("student_plan_exercises").delete().in("plan_id", oldIds);
      await supabaseAdmin.from("student_plans").delete().in("id", oldIds);
    }

    const answers = { nivel: data.nivel, dias: data.dias, tempo: data.tempo, objetivo: data.objetivo, workout_type: data.workout_type, limitacoes: data.limitacoes ?? "" };
    const result = await buildAndSavePlans(userId, "Aluno Teste", resolvePlanTier(data.tier), answers, 25000);
    return { ...result, email: TEST_ACCOUNT_EMAIL, password };
  });
