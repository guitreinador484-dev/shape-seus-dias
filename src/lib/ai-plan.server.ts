// Server-only: gera o plano de treino com IA a partir das respostas do funil
// e grava o treino + PDF na conta do aluno.

import { buildWorkoutPdf, DAY_NAMES } from "./workout-pdf";
import { resolvePlanTier, type PlanTier } from "./plan-tiers";
import { buyerProfile, eligibleVideoExercises, immediateVideoPlan, validateVideoPlan, type VideoExercise } from "./video-workout-catalogue";

const BUCKET = "workout-pdfs";
const PROFESSIONAL = "Gui Treinador";

type AiExercise = {
  exercise_name: string;
  exercise_id?: string;
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
      reasoning: { effort: "low" },
      instructions:
        "Você é um personal trainer brasileiro especialista em MUSCULAÇÃO. Monte uma divisão de treino semanal " +
        "de musculação (academia, pesos livres e máquinas), em português do Brasil. " +
        "O foco principal é SEMPRE o treino de músculo, mesmo para quem quer emagrecer: nesse caso mantenha a musculação " +
        "como base e use apenas um complemento curto de cardio no fim do treino. Não monte treinos só de cardio, " +
        "aeróbico, funcional, HIIT ou peso do corpo. Use nomes de exercícios simples que um iniciante entenda. " + 
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
    "Monte a divisão semanal de MUSCULAÇÃO respeitando a quantidade de dias disponíveis informada e o objetivo declarado. " +
      "Se faltar alguma resposta, NÃO peça mais informações: assuma iniciante, 4 dias (seg, ter, qui, sex) e objetivo de ganhar massa, e monte o treino mesmo assim. " +
      "Se o objetivo for emagrecer, mantenha a musculação como base do treino e acrescente no máximo um cardio curto no final.",
  ].join("\n");
}

export type AiPlanResult = { ok: boolean; plans: number; pdf: boolean; message?: string };

async function loadCatalogue(answers: Record<string, unknown>): Promise<VideoExercise[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("exercises")
    .select("id, name, muscle_group, description, exercise_videos!inner(video_path)");
  if (error) throw new Error("Não foi possível consultar os vídeos de execução.");
  return eligibleVideoExercises(data ?? [], answers);
}

async function savePlans(userId: string, studentName: string, tier: PlanTier, ai: AiResult, answers: Record<string, unknown>): Promise<AiPlanResult & { planIds: string[] }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Recheck the current catalogue at the persistence boundary, including late AI results.
  const checked = validateVideoPlan(ai, await loadCatalogue(answers), answers);
  if (!checked) return { ok: false, plans: 0, pdf: false, planIds: [], message: "O treino precisa usar somente exercícios disponíveis com vídeo." };
  const plans = checked.plans.slice(0, 7);
  const planIds: string[] = [];
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

      const exercises = (plan.exercises ?? []).slice(0, 12);
      if (exercises.length) {
        const { error: exError } = await supabaseAdmin.from("student_plan_exercises").insert(
          exercises.map((ex, index) => ({
            plan_id: planRow.id,
            exercise_name: ex.exercise_name,
            exercise_id: ex.exercise_id,
            sets: ex.sets ?? null,
            reps: ex.reps ?? null,
            rest_seconds: Number.isFinite(ex.rest_seconds) ? ex.rest_seconds : null,
            load_text: ex.load_text ?? null,
            notes: ex.notes ?? null,
            display_order: index,
          })),
        );
        if (exError) {
          console.error("[ai-plan] falha ao salvar exercícios", exError.message);
          await supabaseAdmin.from("student_plans").delete().eq("id", planRow.id);
          continue;
        }
      }

      created += 1;
      planIds.push(planRow.id);

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

    return { ok: created > 0, plans: created, pdf: pdfSaved, planIds };
}

/**
 * Gera (uma única vez) o treino com IA para o comprador de uma venda aprovada.
 * Nunca lança: falhas são registradas e a compra/acesso seguem normalmente.
 */
/** Núcleo compartilhado: monta e salva o treino (imediato + troca pela IA). */
export async function buildAndSavePlans(userId: string, studentName: string, tier: PlanTier, answers: Record<string, unknown>, upgradeWaitMs = 90000): Promise<AiPlanResult> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const catalogue = await loadCatalogue(answers);
    const instantPlan = immediateVideoPlan(catalogue, answers, { maxExercises: tier.exercises[1], goals: tier.pdf.goals, progression: tier.pdf.progression });
    const profile = buyerProfile(answers);
    const cataloguePrompt = buildPrompt(studentName, answers, tier) + "\n" +
      `REGRA OBRIGATÓRIA: use SOMENTE os nomes exatos do catálogo abaixo, todos com vídeo. Não invente, renomeie ou acrescente cardio fora dele. Crie exatamente ${profile.days} dias. Complexidade máxima ${profile.complexity} (1=básica, 2=moderada, 3=alta). Tempo disponível: ${profile.minutes} minutos. O plano comercial não determina experiência. Respeite limitações informadas; não prescreva exercícios que agravem dor ou lesão.\n` +
      JSON.stringify(catalogue.map(ex => ({ name: ex.name, group: ex.group, complexity: ex.complexity, description: ex.description })));
    const aiPromise = askAiForPlan(cataloguePrompt, tier)
      .then(r => validateVideoPlan(r, catalogue, answers))
      .catch((e) => { console.error("[ai-plan] IA falhou:", e instanceof Error ? e.message : e); return null; });

    // Espera no máximo 2,5s pela IA; se demorar, libera na hora um treino montado pelas respostas.
    const quick = await Promise.race([aiPromise, new Promise<"timeout">((r) => setTimeout(() => r("timeout"), 2500))]);
    if (quick && quick !== "timeout") {
      const saved = await savePlans(userId, studentName, tier, quick, answers);
      if (saved.ok) return saved;
    }

    const instant = await savePlans(userId, studentName, tier, instantPlan, answers);
    // Continua esperando a IA e troca pelo treino personalizado quando ficar pronto.
    const studentId = userId;
    const upgrade = aiPromise.then(async (ai) => {
      if (!ai || !instant.ok) return;
      const { data: done } = await supabaseAdmin.from("student_plan_exercises").select("id")
        .in("plan_id", instant.planIds).not("completed_at", "is", null).limit(1);
      if (done?.length) return; // aluno já começou a usar: não mexe
      const replacement = await savePlans(studentId, studentName, tier, ai, answers);
      if (!replacement.ok || replacement.plans !== ai.plans.length) {
        if (replacement.planIds.length) {
          await supabaseAdmin.from("workout_pdfs").delete().in("plan_id", replacement.planIds);
          await supabaseAdmin.from("student_plan_exercises").delete().in("plan_id", replacement.planIds);
          await supabaseAdmin.from("student_plans").delete().in("id", replacement.planIds);
        }
        return;
      }
      await supabaseAdmin.from("workout_pdfs").delete().in("plan_id", instant.planIds);
      await supabaseAdmin.from("student_plan_exercises").delete().in("plan_id", instant.planIds);
      await supabaseAdmin.from("student_plans").delete().in("id", instant.planIds);

    }).catch((e) => console.error("[ai-plan] falha ao trocar pelo treino da IA", e));
    await Promise.race([upgrade, new Promise((r) => setTimeout(r, upgradeWaitMs))]);
    return instant;
}

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
    return await buildAndSavePlans(userId, studentName, resolvePlanTier(purchase.plan_id), answers, 90000);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ai-plan] erro", message);
    return { ok: false, plans: 0, pdf: false, message };
  }
}

/**
 * Rede de segurança: o aluno abriu a plataforma e ainda não tem treino.
 * Procura a compra aprovada dele e gera o treino na hora.
 */
export async function ensureAiPlanForUser(userId: string): Promise<AiPlanResult> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: plans } = await supabaseAdmin
      .from("student_plans")
      .select("id")
      .eq("student_id", userId)
      .limit(1);
    if (plans?.length) return { ok: true, plans: 0, pdf: false, message: "Aluno já possui treinos" };

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const email = profile?.email?.trim().toLowerCase() ?? null;

    let reference: string | null = null;
    const { data: byUser } = await supabaseAdmin
      .from("purchases")
      .select("provider_reference, created_at")
      .eq("user_id", userId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1);
    reference = byUser?.[0]?.provider_reference ?? null;

    if (!reference && email) {
      const { data: byEmail } = await supabaseAdmin
        .from("purchases")
        .select("provider_reference, created_at")
        .eq("customer_email", email)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(1);
      reference = byEmail?.[0]?.provider_reference ?? null;
    }

    if (!reference) return { ok: false, plans: 0, pdf: false, message: "Nenhuma compra aprovada encontrada" };
    return generateAiPlanForPurchase(reference);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ai-plan] erro ensure", message);
    return { ok: false, plans: 0, pdf: false, message };
  }
}
