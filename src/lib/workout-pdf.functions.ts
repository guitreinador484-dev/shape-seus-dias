import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AdminClient = typeof import("@/integrations/supabase/client.server").supabaseAdmin;

const BUCKET = "workout-pdfs";

async function isAdmin(supabaseAdmin: AdminClient, userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .limit(1);
  return Boolean(data?.length);
}

async function assertAdmin(supabaseAdmin: AdminClient, userId: string) {
  if (!(await isAdmin(supabaseAdmin, userId))) {
    throw new Error("Acesso negado: apenas administradores");
  }
}

function decodeBase64(base64: string): Uint8Array {
  const clean = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

type SaveInput = {
  planId: string;
  studentId: string;
  fileBase64: string;
  fileName?: string;
  source?: "generated" | "upload";
};

/** Admin-only: salva (ou substitui) o PDF de um treino. */
export const saveWorkoutPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SaveInput) => {
    if (!input?.planId || !input?.studentId) throw new Error("Treino ou aluno não informado");
    if (!input?.fileBase64) throw new Error("Arquivo PDF não recebido");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);

    const { data: existing } = await supabaseAdmin
      .from("workout_pdfs")
      .select("id, file_path, version")
      .eq("plan_id", data.planId)
      .maybeSingle();

    const version = (existing?.version ?? 0) + 1;
    const path = `${data.studentId}/${data.planId}-v${version}.pdf`;
    const bytes = decodeBase64(data.fileBase64);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (uploadError) throw new Error(`Não foi possível enviar o PDF: ${uploadError.message}`);

    if (existing?.file_path && existing.file_path !== path) {
      await supabaseAdmin.storage.from(BUCKET).remove([existing.file_path]);
    }

    const payload = {
      student_id: data.studentId,
      plan_id: data.planId,
      file_path: path,
      file_name: data.fileName ?? `treino-v${version}.pdf`,
      version,
      source: data.source ?? "generated",
      generated_at: new Date().toISOString(),
    };

    const { error } = existing
      ? await supabaseAdmin.from("workout_pdfs").update(payload).eq("id", existing.id)
      : await supabaseAdmin.from("workout_pdfs").insert(payload);
    if (error) throw new Error(`Não foi possível salvar o PDF: ${error.message}`);

    return { ok: true as const, version, path };
  });

/** Admin-only: exclui o PDF de um treino. */
export const deleteWorkoutPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { planId: string }) => {
    if (!input?.planId) throw new Error("Treino não informado");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);

    const { data: existing } = await supabaseAdmin
      .from("workout_pdfs")
      .select("id, file_path")
      .eq("plan_id", data.planId)
      .maybeSingle();
    if (!existing) return { ok: true as const };

    await supabaseAdmin.storage.from(BUCKET).remove([existing.file_path]);
    const { error } = await supabaseAdmin.from("workout_pdfs").delete().eq("id", existing.id);
    if (error) throw new Error(`Não foi possível excluir o PDF: ${error.message}`);
    return { ok: true as const };
  });

/** Link temporário (1h) para ver/baixar o PDF. Dono do treino ou admin. */
export const getWorkoutPdfUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { planId: string; download?: boolean }) => {
    if (!input?.planId) throw new Error("Treino não informado");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("workout_pdfs")
      .select("student_id, file_path, file_name")
      .eq("plan_id", data.planId)
      .maybeSingle();
    if (!row) throw new Error("PDF não encontrado");

    if (row.student_id !== context.userId && !(await isAdmin(supabaseAdmin, context.userId))) {
      throw new Error("Acesso negado a este arquivo");
    }

    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(row.file_path, 3600, data.download ? { download: row.file_name ?? "treino.pdf" } : undefined);
    if (error || !signed?.signedUrl) throw new Error("Não foi possível abrir o PDF");

    return { url: signed.signedUrl };
  });

/** Lista os PDFs do aluno autenticado (ou de todos, se admin). */
export const listWorkoutPdfs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workout_pdfs")
      .select("id, plan_id, student_id, file_name, version, generated_at, source")
      .order("generated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
