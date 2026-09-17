ALTER TABLE public.student_plan_exercises ADD COLUMN IF NOT EXISTS load_text text;

CREATE TABLE IF NOT EXISTS public.workout_pdfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.student_plans(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text,
  version integer NOT NULL DEFAULT 1,
  source text NOT NULL DEFAULT 'generated',
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workout_pdfs_plan_unique UNIQUE (plan_id)
);

GRANT SELECT ON public.workout_pdfs TO authenticated;
GRANT ALL ON public.workout_pdfs TO service_role;

ALTER TABLE public.workout_pdfs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Alunos veem seus PDFs" ON public.workout_pdfs;
CREATE POLICY "Alunos veem seus PDFs" ON public.workout_pdfs
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin gerencia PDFs" ON public.workout_pdfs;
CREATE POLICY "Admin gerencia PDFs" ON public.workout_pdfs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_workout_pdfs_updated ON public.workout_pdfs;
CREATE TRIGGER trg_workout_pdfs_updated BEFORE UPDATE ON public.workout_pdfs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS workout_pdfs_student_idx ON public.workout_pdfs (student_id);

DROP POLICY IF EXISTS "workout pdfs read own" ON storage.objects;
CREATE POLICY "workout pdfs read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'workout-pdfs'
    AND (public.has_role(auth.uid(), 'admin') OR (storage.foldername(name))[1] = auth.uid()::text)
  );

DROP POLICY IF EXISTS "workout pdfs admin write" ON storage.objects;
CREATE POLICY "workout pdfs admin write" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'workout-pdfs' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'workout-pdfs' AND public.has_role(auth.uid(), 'admin'));