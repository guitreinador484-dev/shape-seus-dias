// Server-only: gera o plano de treino com IA a partir das respostas do funil
// e grava o treino + PDF na conta do aluno.

import { buildWorkoutPdf, DAY_NAMES } from "./workout-pdf";
import { resolvePlanTier, type PlanTier } from "./plan-tiers";

const BUCKET = "workout-pdfs";
const PROFESSIONAL = "Gui Treinador";

type AiExercise = {
  exercise_name: string;
  sets: string;
  reps: string;
  rest_seconds: number;
  load_text: string | null;
  notes: string | null;
};

type AiPlan = {
  day_of_week: number;
  plan_name: string;
  exercises: AiExercise[];
};

type AiResult = {
  summary: string | null;
  goals: string[] | null;
  progression: string | null;
  plans: AiPlan[];
};

const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "goals", "progression", "plans"],
  properties: {
    summary: { type: ["string", "null"] },
    goals: { type: ["array", "null"], items: { type: "string" } },
    progression: { type: ["string", "null"] },
    plans: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["day_of_week", "plan_name", "exercises"],
        properties: {
          day_of_week: { type: "integer" },
          plan_name: { type: "string" },
          exercises: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["exercise_name", "sets", "reps", "rest_seconds", "load_text", "notes"],
              properties: {
                exercise_name: { type: "string" },
                sets: { type: "string" },
                reps: { type: "string" },
                rest_seconds: { type: "integer" },
                load_text: { type: ["string", "null"] },
                notes: { type: ["string", "null"] },
              },
            },
          },
        },
      },
    },
  },
} as const;

function decodeBase64(base64: string): Uint8Array {
  const clean = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Chama o Lovable AI Gateway (streaming obrigatório) e devolve o JSON do plano. */
async function askAiForPlan(promptText: string, tier: PlanTier): Promise<AiResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      reasoning: { effort: "low", summary: "auto" },
      instructions:
        "Você é um personal trainer brasileiro. Monte uma divisão de treino semanal segura e objetiva " +
        "para academia, em português do Brasil. Use nomes de exercícios simples que um iniciante entenda. " +
        `Crie um treino por dia disponível (day_of_week: 0=domingo ... 6=sábado), com ${tier.exercises[0]} a ${tier.exercises[1]} exercícios cada, ` +
        "séries, repetições, descanso em segundos e observações curtas de execução. " +
        "Em load_text sugira uma orientação de carga (ex.: 'peso leve', 'moderado') ou null. " +
        `O aluno comprou o ${tier.name}. ${tier.aiInstructions} ` +
        "Em summary, escreva uma frase resumindo o objetivo do aluno. " +
        (tier.pdf.goals
          ? "Em goals, liste de 3 a 5 metas de treino. "
          : "Deixe goals como null. ") +
        (tier.pdf.progression
          ? "Em progression, explique como aumentar a carga ao longo das semanas."
          : "Deixe progression como null."),
      input: promptText,
      text: {
        format: {
          type: "json_schema",
          name: "plano_treino",
          strict: true,
          schema: PLAN_SCHEMA,
        },
      },
    }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gateway ${res.status}: ${body.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          text += evt.delta;
        } else if (evt.type === "response.completed" && evt.response?.output_text) {
          if (!text) text = evt.response.output_text;
        }
      } catch {
        /* evento parcial */
      }
    }
  }

  if (!text.trim()) throw new Error("A IA não retornou conteúdo");
  return JSON.parse(text) as AiResult;
}

function buildPrompt(name: string, answers: Record<string, unknown>, tier: PlanTier): string {
  return [
    `Aluno: ${name || "Aluno"}.`,
    `Plano comprado: ${tier.name} (${tier.tagline}).`,
    `Atualização do treino a cada ${tier.updateEveryDays} dias.`,
    "Respostas do questionário (JSON):",
    JSON.stringify(answers, null, 2),
    "Monte a divisão semanal respeitando a quantidade de dias disponíveis informada e o objetivo declarado.",
  ].join("\n");
}

export type AiPlanResult = { ok: boolean; plans: number; pdf: boolean; message?: string };

/**
 * Gera (uma única vez) o treino com IA para o comprador de uma venda aprovada.
 * Nunca lança: falhas são registradas e a compra/acesso seguem normalmente.
 */
export async function generateAiPlanForPurchase(reference: string): Promise<AiPlanResult> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: purchase } = await supabaseAdmin
      .from("purchases")
      .select("user_id, customer_email, customer_name, status, plan_id")
      .eq("provider_reference", reference)
      .maybeSingle();

    if (!purchase || purchase.status !== "approved") {
      return { ok: false, plans: 0, pdf: false, message: "Pagamento não confirmado" };
    }

    const email = purchase.customer_email?.trim().toLowerCase();
    let userId = purchase.user_id;
    if (!userId && email) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      userId = profile?.id ?? null;
    }
    if (!userId) return { ok: false, plans: 0, pdf: false, message: "Conta do aluno não encontrada" };

    // Idempotente: se o aluno já tem treinos, não gera de novo.
    const { data: existingPlans } = await supabaseAdmin
      .from("student_plans")
      .select("id")
      .eq("student_id", userId)
      .limit(1);
    if (existingPlans?.length) return { ok: true, plans: 0, pdf: false, message: "Aluno já possui treinos" };

    let answers: Record<string, unknown> = {};
    if (email) {
      const { data: lead } = await supabaseAdmin
        .from("leads")
        .select("answers")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      answers = (lead?.answers as Record<string, unknown> | null) ?? {};
    }

    const studentName = purchase.customer_name || email || "Aluno";
    const tier = resolvePlanTier(purchase.plan_id);
    const ai = await askAiForPlan(buildPrompt(studentName, answers, tier), tier);
    const plans = (ai.plans ?? []).slice(0, 7);
    if (!plans.length) return { ok: false, plans: 0, pdf: false, message: "A IA não retornou treinos" };

    let pdfSaved = false;
    let created = 0;

    for (const plan of plans) {
      const day = Number.isInteger(plan.day_of_week) ? Math.min(6, Math.max(0, plan.day_of_week)) : created;
      const { data: planRow, error: planError } = await supabaseAdmin
        .from("student_plans")
        .insert({
          student_id: userId,
          day_of_week: day,
          plan_name: plan.plan_name || `Treino ${DAY_NAMES[day]}`,
        })
        .select("id")
        .single();
      if (planError || !planRow) {
        console.error("[ai-plan] falha ao criar treino", planError?.message);
        continue;
      }
      created += 1;

      const exercises = (plan.exercises ?? []).slice(0, 12);
      if (exercises.length) {
        const { error: exError } = await supabaseAdmin.from("student_plan_exercises").insert(
          exercises.map((ex, index) => ({
            plan_id: planRow.id,
            exercise_name: ex.exercise_name,
            sets: ex.sets ?? null,
            reps: ex.reps ?? null,
            rest_seconds: Number.isFinite(ex.rest_seconds) ? ex.rest_seconds : null,
            load_text: ex.load_text ?? null,
            notes: ex.notes ?? null,
            display_order: index,
          })),
        );
        if (exError) console.error("[ai-plan] falha ao salvar exercícios", exError.message);
      }

      // PDF do treino, vinculado ao aluno e ao treino
      try {
        const { base64, fileName } = buildWorkoutPdf({
          studentName,
          planName: plan.plan_name || `Treino ${DAY_NAMES[day]}`,
          dayOfWeek: day,
          professional: PROFESSIONAL,
          exercises,
          tierLabel: tier.name,
          updateNote: `Atualização a cada ${tier.updateEveryDays} dias`,
          summary: ai.summary ?? null,
          goals: tier.pdf.goals ? (ai.goals ?? null) : null,
          progression: tier.pdf.progression ? (ai.progression ?? null) : null,
        });
        const path = `${userId}/${planRow.id}-v1.pdf`;
        const { error: upErr } = await supabaseAdmin.storage
          .from(BUCKET)
          .upload(path, decodeBase64(base64), { contentType: "application/pdf", upsert: true });
        if (upErr) throw new Error(upErr.message);
        await supabaseAdmin.from("workout_pdfs").upsert(
          {
            student_id: userId,
            plan_id: planRow.id,
            file_path: path,
            file_name: fileName,
            version: 1,
            source: "generated",
            generated_at: new Date().toISOString(),
          },
          { onConflict: "plan_id" },
        );
        pdfSaved = true;
      } catch (e) {
        console.error("[ai-plan] falha ao gerar PDF", e instanceof Error ? e.message : e);
      }
    }

    return { ok: created > 0, plans: created, pdf: pdfSaved };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ai-plan] erro", message);
    return { ok: false, plans: 0, pdf: false, message };
  }
}
