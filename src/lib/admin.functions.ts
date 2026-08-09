import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

type AdminClient = typeof import("@/integrations/supabase/client.server").supabaseAdmin;

/** Server-side admin check using the service-role client (bypasses RLS). */
async function assertAdmin(supabaseAdmin: AdminClient, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .limit(1);
  if (error) throw new Error(`Falha ao verificar permissão: ${error.message}`);
  if (!data?.length) throw new Error("Acesso negado: apenas administradores");
}

/**
 * Server-side admin check. Throws if the caller is not an admin.
 * Use from loaders to enforce admin access before rendering.
 */
export const requireAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .limit(1);
    if (error) throw new Error("Failed to verify admin role");
    if (!data?.length) throw new Error("Forbidden");
    return { ok: true as const };
  });

type CreateStudentInput = {
  email: string;
  password: string;
  full_name?: string;
  whatsapp?: string;
  role?: "online" | "presencial" | "admin";
  has_class_access?: boolean;
};

/**
 * Admin-only: create a new student login (email/password) and seed profile + role.
 */
export const createStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateStudentInput) => {
    if (!input?.email || !input?.password) throw new Error("Email e senha são obrigatórios");
    if (input.password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify caller is admin using service role (bypasses RLS quirks)
    await assertAdmin(supabaseAdmin, context.userId);

    const role = data.role ?? "online";
    const hasAccess = data.has_class_access ?? (role !== "presencial");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name ?? null,
        whatsapp: data.whatsapp ?? null,
        role,
      },
    });
    if (createErr) throw new Error(createErr.message);
    const userId = created.user?.id;
    if (!userId) throw new Error("Falha ao criar usuário");

    // The handle_new_user trigger seeds profile + role; ensure values match requested input.
    await supabaseAdmin.from("profiles").update({
      full_name: data.full_name ?? null,
      whatsapp: data.whatsapp ?? null,
      has_class_access: hasAccess,
    }).eq("id", userId);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });

    return { ok: true as const, user_id: userId };
  });

type UpdateStudentStatusInput = {
  userId: string;
  full_name?: string | null;
  whatsapp?: string | null;
  has_class_access?: boolean;
  is_active?: boolean;
  access_expires_at?: string | null;
  role?: AppRole;
};

/**
 * Admin-only: atualiza dados do aluno (perfil + tipo de aluno). Aprovação/revogação
 * de acesso por venda é feita pelo trigger de purchases.
 */
export const updateStudentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: UpdateStudentStatusInput) => {
    if (!input?.userId) throw new Error("Aluno não informado");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);

    if (data.role) {
      const { data: currentRoles } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", data.userId);
      const isAdmin = (currentRoles ?? []).some((r) => r.role === "admin");
      if (isAdmin && data.role !== "admin") {
        throw new Error("Este email precisa continuar como administrador.");
      }
      const { error: delErr } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
      if (delErr) throw new Error(delErr.message);
      const { error: insErr } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
      if (insErr) throw new Error(insErr.message);
    }

    const profilePatch: Database["public"]["Tables"]["profiles"]["Update"] = {};
    if (data.full_name !== undefined) profilePatch.full_name = data.full_name;
    if (data.whatsapp !== undefined) profilePatch.whatsapp = data.whatsapp;
    if (data.has_class_access !== undefined) profilePatch.has_class_access = data.has_class_access;
    if (data.is_active !== undefined) profilePatch.is_active = data.is_active;
    if (data.access_expires_at !== undefined) profilePatch.access_expires_at = data.access_expires_at;
    if (Object.keys(profilePatch).length > 0) {
      const { error } = await supabaseAdmin.from("profiles").update(profilePatch).eq("id", data.userId);
      if (error) throw new Error(error.message);
    }

    return { ok: true as const };
  });

type SavePurchaseInput = {
  id?: string | null;
  user_id?: string | null;
  amount: number;
  status: string;
  customer_name?: string | null;
  customer_email?: string | null;
  transaction_id?: string | null;
};

/**
 * Admin-only: registra/atualiza uma venda. O trigger `trg_purchases_sync_access`
 * libera ou revoga o acesso do aluno conforme o status.
 */
export const savePurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SavePurchaseInput) => {
    if (!input || typeof input !== "object") throw new Error("Dados inválidos");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);

    const payload = {
      user_id: data.user_id || null,
      amount: Number(data.amount || 0),
      status: data.status,
      customer_name: data.customer_name || null,
      customer_email: data.customer_email || null,
      transaction_id: data.transaction_id || null,
    };
    const { error } = data.id
      ? await supabaseAdmin.from("purchases").update(payload).eq("id", data.id)
      : await supabaseAdmin.from("purchases").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

type TrainingPlanInput = {
  student_id: string;
  day_of_week: number;
  plan_name: string;
};

export const createTrainingPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: TrainingPlanInput) => {
    if (!input?.student_id) throw new Error("Aluno não informado");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);
    const { error } = await supabaseAdmin.from("student_plans").insert({
      student_id: data.student_id,
      day_of_week: Number(data.day_of_week || 0),
      plan_name: data.plan_name || "Treino",
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteTrainingPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { planId: string }) => {
    if (!input?.planId) throw new Error("Treino não informado");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);
    const { error: exerciseError } = await supabaseAdmin.from("student_plan_exercises").delete().eq("plan_id", data.planId);
    if (exerciseError) throw new Error(exerciseError.message);
    const { error } = await supabaseAdmin.from("student_plans").delete().eq("id", data.planId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

type PlanExerciseInput = {
  plan_id: string;
  exercise_name: string;
  sets?: string | null;
  reps?: string | null;
  rest_seconds?: number | null;
  notes?: string | null;
  display_order: number;
};

export const addPlanExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: PlanExerciseInput) => {
    if (!input?.plan_id || !input?.exercise_name) throw new Error("Exercício inválido");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);
    const { error } = await supabaseAdmin.from("student_plan_exercises").insert({
      plan_id: data.plan_id,
      exercise_name: data.exercise_name,
      sets: data.sets ?? null,
      reps: data.reps ?? null,
      rest_seconds: data.rest_seconds ?? 0,
      notes: data.notes ?? null,
      display_order: data.display_order,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deletePlanExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { exerciseId: string }) => {
    if (!input?.exerciseId) throw new Error("Exercício não informado");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);
    const { error } = await supabaseAdmin.from("student_plan_exercises").delete().eq("id", data.exerciseId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

type ToggleEnrollmentInput = {
  course_id: string;
  user_id: string;
  enrolled: boolean;
};

export const toggleCourseEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ToggleEnrollmentInput) => {
    if (!input?.course_id || !input?.user_id) throw new Error("Matrícula inválida");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);
    const { error } = data.enrolled
      ? await supabaseAdmin.from("course_enrollments").insert({ course_id: data.course_id, user_id: data.user_id })
      : await supabaseAdmin.from("course_enrollments").delete().eq("course_id", data.course_id).eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });