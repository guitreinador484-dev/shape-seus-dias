type SmartTrainingPlanInput = {
  student_id: string;
  days_count: number;
  workout_type: "tradicional" | "intercalado" | "circuito";
  emphasis?: string | null;
  level?: "iniciante" | "intermediario" | "avancado";
  answers?: Record<string, unknown>;
  planTierId?: string;
};


/** Saves the complete video-only grid atomically before generating optional PDFs. */
export async function generateVideoTrainingGrid(data: SmartTrainingPlanInput) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { eligibleVideoExercises, immediateVideoPlan, validateVideoPlan, buyerProfile } = await import("./video-workout-catalogue");
    const { buildWorkoutPdf } = await import("./workout-pdf");
    const { resolvePlanTier } = await import("./plan-tiers");
    const tier = data.planTierId ? resolvePlanTier(data.planTierId) : null;


    // Consulta os dados do aluno
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", data.student_id)
      .maybeSingle();

    const studentName = profile?.full_name || profile?.email || "Aluno";

    // Consulta a biblioteca de vídeos
    const { data: rawCatalogue, error: catalogueError } = await supabaseAdmin
      .from("exercises")
      .select("id, name, muscle_group, description, exercise_videos!inner(video_path)");
    if (catalogueError) throw new Error("Não foi possível carregar a biblioteca de vídeos.");

    // Only real recordings are eligible; never fabricate video availability.
    const rows = (rawCatalogue ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      muscle_group: r.muscle_group || "Outros",
      description: r.description,
      exercise_videos: (r.exercise_videos as { video_path: string }[] | null) ?? [],
    }));

    const mockAnswers = data.answers ?? {
      measurements: {
        nivel: data.level || "intermediario",
        dias: `${data.days_count}x na semana`,
        objetivo: data.emphasis ? `Ênfase em ${data.emphasis}` : "Hipertrofia",
      },
      broad: { tempo: "45 minutos" },
      workout_type: data.workout_type,
      emphasis: data.emphasis,
    };

    const eligible = eligibleVideoExercises(rows, mockAnswers);
    if (!eligible.length) throw new Error("Ainda não há exercícios com vídeo adequados ao nível escolhido. Complete a Biblioteca.");

    const generated = immediateVideoPlan(eligible, mockAnswers, {
      maxExercises: tier?.exercises[1] ?? 7,
      goals: tier?.pdf.goals ?? true,
      progression: tier?.pdf.progression ?? true,
      workoutType: data.workout_type,
      emphasis: buyerProfile(mockAnswers).emphasis,
    });

    const checked = validateVideoPlan(generated, eligible, mockAnswers);
    if (!checked) throw new Error("Não foi possível montar uma grade válida com vídeos.");
    const { data: saved, error: saveError } = await supabaseAdmin.rpc("save_video_training_grid", {
      _student_id: data.student_id,
      _plans: checked.plans,
    });
    if (saveError) throw new Error(`Não foi possível salvar o treino: ${saveError.message}`);
    const planRows = saved as { id: string; day_of_week: number }[] | null;
    if (!planRows || planRows.length !== checked.plans.length) throw new Error("A grade não foi salva por completo.");
    let pdfCount = 0;
    for (const plan of checked.plans) {
      const day = plan.day_of_week;
      const planRow = planRows.find(row => row.day_of_week === day);
      if (!planRow) throw new Error("Dia de treino não encontrado após salvar.");

      // Gera o PDF
      try {
        const { base64, fileName } = buildWorkoutPdf({
          studentName,
          planName: plan.plan_name,
          dayOfWeek: day,
          professional: "Gui Treinador",
          exercises: plan.exercises,
          tierLabel: tier?.name ?? (data.workout_type === "intercalado" ? "Método Intercalado" : "Musculação Personalizada"),
          summary: generated.summary,
          goals: generated.goals,
          progression: generated.progression,
          emphasis: data.emphasis,
          workoutType: data.workout_type,
        });

        const path = `${data.student_id}/${planRow.id}-v1.pdf`;
        const bin = atob(base64.includes(",") ? base64.split(",")[1] : base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

        const { error: uploadError } = await supabaseAdmin.storage
          .from("workout-pdfs")
          .upload(path, bytes, { contentType: "application/pdf", upsert: true });

        if (uploadError) throw uploadError;
        const { error: pdfError } = await supabaseAdmin.from("workout_pdfs").upsert(
          {
            student_id: data.student_id,
            plan_id: planRow.id,
            file_path: path,
            file_name: fileName,
            version: 1,
            source: "generated",
            generated_at: new Date().toISOString(),
          },
          { onConflict: "plan_id" },
        );
        if (pdfError) throw pdfError;
        pdfCount++;
      } catch (err) {
        console.error("[generateSmartTrainingPlan] falha ao gerar PDF:", err);
      }


    }

    return { ok: true as const, plansCount: planRows.length, pdfCount };
}
