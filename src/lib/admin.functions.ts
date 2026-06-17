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