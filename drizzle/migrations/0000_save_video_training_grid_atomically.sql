CREATE OR REPLACE FUNCTION public.save_video_training_grid(_student_id uuid, _plans jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  p jsonb;
  ex jsonb;
  plan_id uuid;
  exercise_row public.exercises;
  result jsonb := '[]'::jsonb;
  days integer[] := ARRAY[]::integer[];
  position integer;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id = _student_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Aluno não encontrado.'; END IF;
  IF jsonb_typeof(_plans) IS DISTINCT FROM 'array' OR jsonb_array_length(_plans) NOT BETWEEN 2 AND 6 THEN
    RAISE EXCEPTION 'Informe de dois a seis dias de treino.';
  END IF;
  FOR p IN SELECT value FROM jsonb_array_elements(_plans) LOOP
    IF (p->>'day_of_week')::integer NOT BETWEEN 0 AND 6 OR (p->>'day_of_week') IS NULL OR (p->>'day_of_week')::integer = ANY(days) THEN
      RAISE EXCEPTION 'Dias de treino inválidos ou repetidos.';
    END IF;
    days := array_append(days, (p->>'day_of_week')::integer);
    IF jsonb_typeof(p->'exercises') IS DISTINCT FROM 'array' OR jsonb_array_length(p->'exercises') = 0 THEN
      RAISE EXCEPTION 'Não é permitido salvar um treino vazio.';
    END IF;
    FOR ex IN SELECT value FROM jsonb_array_elements(p->'exercises') LOOP
      SELECT e.* INTO exercise_row FROM public.exercises e
      WHERE e.id = (ex->>'exercise_id')::uuid
      AND EXISTS (SELECT 1 FROM public.exercise_videos v WHERE v.exercise_id = e.id AND length(btrim(v.video_path)) > 0 AND v.video_path <> 'placeholder');
      IF NOT FOUND THEN RAISE EXCEPTION 'Todo exercício precisa ter um vídeo de execução cadastrado.'; END IF;
    END LOOP;
  END LOOP;
  FOR p IN SELECT value FROM jsonb_array_elements(_plans) LOOP
    INSERT INTO public.student_plans (student_id, day_of_week, plan_name)
    VALUES (_student_id, (p->>'day_of_week')::integer, p->>'plan_name')
    ON CONFLICT (student_id, day_of_week) DO UPDATE SET plan_name = EXCLUDED.plan_name, updated_at = now()
    RETURNING id INTO plan_id;
    DELETE FROM public.workout_pdfs WHERE workout_pdfs.plan_id = plan_id;
    DELETE FROM public.student_plan_exercises WHERE student_plan_exercises.plan_id = plan_id;
    position := 0;
    FOR ex IN SELECT value FROM jsonb_array_elements(p->'exercises') LOOP
      INSERT INTO public.student_plan_exercises (plan_id, exercise_id, exercise_name, sets, reps, rest_seconds, load_text, notes, display_order)
      SELECT plan_id, e.id, e.name, ex->>'sets', ex->>'reps', (ex->>'rest_seconds')::integer, ex->>'load_text', ex->>'notes', position
      FROM public.exercises e WHERE e.id = (ex->>'exercise_id')::uuid;
      position := position + 1;
    END LOOP;
    result := result || jsonb_build_array(jsonb_build_object('id', plan_id, 'day_of_week', (p->>'day_of_week')::integer));
  END LOOP;
  DELETE FROM public.student_plans WHERE student_id = _student_id AND NOT (day_of_week = ANY(days));
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.save_video_training_grid(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_video_training_grid(uuid, jsonb) TO service_role;