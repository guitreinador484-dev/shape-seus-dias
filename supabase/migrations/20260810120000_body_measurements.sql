-- 20260810120000_body_measurements.sql
-- Acompanhamento de evolução: medidas corporais + fotos de progresso por aluno.

CREATE TABLE public.body_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  weight_kg NUMERIC(5,2),
  waist_cm NUMERIC(5,2),
  chest_cm NUMERIC(5,2),
  arm_cm NUMERIC(5,2),
  hip_cm NUMERIC(5,2),
  thigh_cm NUMERIC(5,2),
  photo_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_body_measurements_user ON public.body_measurements (user_id, measured_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_measurements TO authenticated;
GRANT ALL ON public.body_measurements TO service_role;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own measurements" ON public.body_measurements
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage measurements" ON public.body_measurements
  FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

-- Storage privado para fotos de progresso (pasta = user_id).
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins full access progress-photos" ON storage.objects;
CREATE POLICY "Admins full access progress-photos" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'progress-photos' AND app_private.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'progress-photos' AND app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users insert own progress-photos" ON storage.objects;
CREATE POLICY "Users insert own progress-photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users read own progress-photos" ON storage.objects;
CREATE POLICY "Users read own progress-photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
