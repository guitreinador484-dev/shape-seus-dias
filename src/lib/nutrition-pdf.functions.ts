import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "nutrition-pdfs";
type AdminClient = typeof import("@/integrations/supabase/client.server").supabaseAdmin;

async function assertAdmin(client: AdminClient, userId: string) {
  const { data } = await client.from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").limit(1);
  if (!data?.length) throw new Error("Acesso permitido somente ao administrador.");
}

function decodeBase64(base64: string): Uint8Array {
  const clean = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export const getNutritionPdf = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("nutrition_pdfs")
      .select("id, title, file_name, version, is_active, updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar o PDF alimentar.");
    return data;
  });

export const getNutritionPdfUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { download?: boolean }) => input ?? {})
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", context.userId).eq("role", "admin").limit(1);
    const admin = Boolean(role?.length);
    if (!admin) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("has_class_access, is_active, access_expires_at, has_nutrition_access, has_order_bump")
        .eq("id", context.userId)
        .maybeSingle();
      const expired = profile?.access_expires_at && new Date(profile.access_expires_at).getTime() <= Date.now();
      if (!profile?.has_class_access || !profile.is_active || expired || !(profile.has_nutrition_access || profile.has_order_bump)) {
        throw new Error("Este PDF não está liberado no seu acesso.");
      }
    }
    const { data: pdf } = await supabaseAdmin.from("nutrition_pdfs").select("file_path, file_name").eq("is_active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (!pdf) throw new Error("PDF alimentar ainda não enviado.");
    const { data: signed, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(
      pdf.file_path,
      3600,
      data.download ? { download: pdf.file_name } : undefined,
    );
    if (error || !signed?.signedUrl) throw new Error("Não foi possível abrir o PDF alimentar.");
    return { url: signed.signedUrl };
  });

export const saveNutritionPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { title: string; fileName: string; fileBase64: string }) => {
    if (!input?.fileBase64 || !input.fileName.toLowerCase().endsWith(".pdf")) throw new Error("Envie um arquivo PDF válido.");
    return { ...input, title: input.title.trim() || "Guia de alimentação" };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);
    const { data: current } = await supabaseAdmin.from("nutrition_pdfs").select("id, file_path, version").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    const version = (current?.version ?? 0) + 1;
    const path = `global/alimentacao-v${version}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, decodeBase64(data.fileBase64), { contentType: "application/pdf", upsert: true });
    if (uploadError) throw new Error(`Não foi possível enviar o PDF: ${uploadError.message}`);
    const payload = { title: data.title, file_name: data.fileName, file_path: path, version, is_active: true };
    const { error } = current
      ? await supabaseAdmin.from("nutrition_pdfs").update(payload).eq("id", current.id)
      : await supabaseAdmin.from("nutrition_pdfs").insert(payload);
    if (error) throw new Error(`Não foi possível salvar o PDF: ${error.message}`);
    if (current?.file_path && current.file_path !== path) await supabaseAdmin.storage.from(BUCKET).remove([current.file_path]);
    const { count } = await supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("has_nutrition_access", true).eq("is_active", true);
    return { ok: true as const, version, eligibleStudents: count ?? 0 };
  });

export const deleteNutritionPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);
    const { data: current } = await supabaseAdmin.from("nutrition_pdfs").select("id, file_path").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (!current) return { ok: true as const };
    await supabaseAdmin.storage.from(BUCKET).remove([current.file_path]);
    const { error } = await supabaseAdmin.from("nutrition_pdfs").delete().eq("id", current.id);
    if (error) throw new Error("Não foi possível excluir o PDF alimentar.");
    return { ok: true as const };
  });

export const countNutritionAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);
    const { count } = await supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("has_nutrition_access", true).eq("is_active", true);
    return { count: count ?? 0 };
  });