-- 20260809094000_persist_training_progress.sql
-- Persiste o progresso do aluno entre sessões:
--   1) student_plan_exercises.completed_at: exercício marcado como feito no treino do dia.
--      O aluno só pode alterar esta coluna (nada mais do próprio plano).
--   2) Tabela workout_progress: retomada de vídeos de treino (watch/posição e conclusão).

-- ==== 1) Progresso do plano de treino ====
ALTER TABLE public.student_plan_exercises
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Policy: aluno pode marcar/desmarcar exercícios do próprio plano.
CREATE POLICY "Students complete own exercises" ON public.student_plan_exercises
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.student_plans p WHERE p.id = plan_id AND p.student_id = auth.uid())
  );

-- Guarda: alunos podem alterar APENAS completed_at. Qualquer outra mudança no
-- próprio plano é revertida (admin passa direto).
CREATE OR REPLACE FUNCTION public.guard_student_plan_exercise_edits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sem contexto de auth (SQL editor/backend) ou admin: passa direto.
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.plan_id := OLD.plan_id;
  NEW.exercise_name := OLD.exercise_name;
  NEW.sets := OLD.sets;
  NEW.reps := OLD.reps;
  NEW.rest_seconds := OLD.rest_seconds;
  NEW.notes := OLD.notes;
  NEW.display_order := OLD.display_order;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_plan_exercises_guard ON public.student_plan_exercises;
CREATE TRIGGER trg_student_plan_exercises_guard
BEFORE UPDATE ON public.student_plan_exercises
FOR EACH ROW EXECUTE FUNCTION public.guard_student_plan_exercise_edits();

-- ==== 2) Retomada de vídeos de workout ====
CREATE TABLE IF NOT EXISTS public.workout_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  watched_seconds int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, workout_id)
);
CREATE INDEX IF NOT EXISTS idx_workout_progress_user ON public.workout_progress (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_progress TO authenticated;
GRANT ALL ON public.workout_progress TO service_role;
ALTER TABLE public.workout_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own workout progress" ON public.workout_progress
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
