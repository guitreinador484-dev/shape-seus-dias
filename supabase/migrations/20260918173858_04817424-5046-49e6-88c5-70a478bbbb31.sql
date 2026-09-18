CREATE OR REPLACE FUNCTION public.unaccent_safe(_txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT translate(
    _txt,
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
  )
$$;

CREATE OR REPLACE FUNCTION public.initcap_first(_txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN _txt = '' THEN _txt ELSE upper(left(_txt, 1)) || substr(_txt, 2) END
$$;

CREATE OR REPLACE FUNCTION public.normalize_exercise_name(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT btrim(regexp_replace(lower(public.unaccent_safe(_name)), '\s+', ' ', 'g'))
$$;

ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS name_normalized text;

UPDATE public.exercises SET name_normalized = public.normalize_exercise_name(name);

-- unifica duplicados: mantém o mais antigo
WITH ranked AS (
  SELECT id, name_normalized,
         first_value(id) OVER (PARTITION BY name_normalized ORDER BY created_at, id) AS keep_id
  FROM public.exercises
)
UPDATE public.exercise_videos v
SET exercise_id = r.keep_id
FROM ranked r
WHERE v.exercise_id = r.id AND r.id <> r.keep_id;

WITH ranked AS (
  SELECT id, name_normalized,
         first_value(id) OVER (PARTITION BY name_normalized ORDER BY created_at, id) AS keep_id
  FROM public.exercises
)
UPDATE public.student_plan_exercises s
SET exercise_id = r.keep_id
FROM ranked r
WHERE s.exercise_id = r.id AND r.id <> r.keep_id;

WITH ranked AS (
  SELECT id, name_normalized,
         first_value(id) OVER (PARTITION BY name_normalized ORDER BY created_at, id) AS keep_id
  FROM public.exercises
)
DELETE FROM public.exercises e
USING ranked r
WHERE e.id = r.id AND r.id <> r.keep_id;

ALTER TABLE public.exercises ALTER COLUMN name_normalized SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS exercises_name_normalized_key
  ON public.exercises (name_normalized);

CREATE OR REPLACE FUNCTION public.set_exercise_name_normalized()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.name := btrim(regexp_replace(NEW.name, '\s+', ' ', 'g'));
  NEW.name_normalized := public.normalize_exercise_name(NEW.name);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_exercises_normalize ON public.exercises;
CREATE TRIGGER trg_exercises_normalize
  BEFORE INSERT OR UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.set_exercise_name_normalized();

CREATE OR REPLACE FUNCTION public.find_or_create_exercise(_name text, _muscle_group text DEFAULT NULL)
RETURNS public.exercises
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text;
  v_row public.exercises;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem criar exercícios.';
  END IF;

  v_norm := public.normalize_exercise_name(coalesce(_name, ''));
  IF v_norm = '' THEN
    RAISE EXCEPTION 'Informe o nome do exercício.';
  END IF;

  SELECT * INTO v_row FROM public.exercises WHERE name_normalized = v_norm;
  IF FOUND THEN
    RETURN v_row;
  END IF;

  INSERT INTO public.exercises (name, muscle_group)
  VALUES (public.initcap_first(btrim(regexp_replace(_name, '\s+', ' ', 'g'))), coalesce(nullif(btrim(coalesce(_muscle_group, '')), ''), 'Outros'))
  ON CONFLICT (name_normalized) DO UPDATE SET name = public.exercises.name
  RETURNING * INTO v_row;

  RETURN v_row;
END $$;

GRANT EXECUTE ON FUNCTION public.find_or_create_exercise(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_exercise_name(text) TO authenticated;