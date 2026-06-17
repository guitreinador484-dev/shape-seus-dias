import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    // Verify caller is admin
    const { data: adminCheck, error: adminErr } = await context.supabase
      .from("user_roles").select("id").eq("user_id", context.userId).eq("role", "admin").limit(1);
    if (adminErr) throw new Error("Falha ao verificar permissão");
    if (!adminCheck?.length) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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