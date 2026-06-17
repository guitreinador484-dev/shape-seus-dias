import { createFileRoute } from "@tanstack/react-router";

/**
 * Idempotent endpoint to provision the admin user.
 * Safe to call repeatedly — only creates the account if it doesn't exist yet.
 */
export const Route = createFileRoute("/api/public/bootstrap-admin")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const adminEmail = "guitreinador484@gmail.com";
        const adminPassword = "guitreinador1";

        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        if (listErr) return Response.json({ ok: false, error: listErr.message }, { status: 500 });

        let userId = list.users.find((u) => u.email?.toLowerCase() === adminEmail)?.id;

        if (!userId) {
          const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: adminEmail,
            password: adminPassword,
            email_confirm: true,
            user_metadata: { full_name: "Gui Treinador", role: "admin" },
          });
          if (createErr || !created.user) {
            return Response.json({ ok: false, error: createErr?.message ?? "create failed" }, { status: 500 });
          }
          userId = created.user.id;
        }

        await supabaseAdmin
          .from("profiles")
          .upsert(
            { id: userId, email: adminEmail, full_name: "Gui Treinador", is_active: true, has_class_access: true },
            { onConflict: "id" },
          );

        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

        return Response.json({ ok: true, userId, email: adminEmail });
      },
    },
  },
});