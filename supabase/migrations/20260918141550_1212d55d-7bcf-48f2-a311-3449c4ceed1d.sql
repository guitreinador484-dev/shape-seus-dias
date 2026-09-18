
CREATE TABLE public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  muscle_group text NOT NULL DEFAULT 'Outros',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercises_select_auth" ON public.exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "exercises_admin_write" ON public.exercises FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER exercises_touch BEFORE UPDATE ON public.exercises FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.gyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  neighborhood text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gyms TO authenticated;
GRANT ALL ON public.gyms TO service_role;
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gyms_select_auth" ON public.gyms FOR SELECT TO authenticated USING (true);
CREATE POLICY "gyms_admin_write" ON public.gyms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER gyms_touch BEFORE UPDATE ON public.gyms FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.exercise_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  gym_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL,
  title text,
  notes text,
  video_path text NOT NULL,
  thumbnail_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX exercise_videos_exercise_idx ON public.exercise_videos (exercise_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_videos TO authenticated;
GRANT ALL ON public.exercise_videos TO service_role;
ALTER TABLE public.exercise_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercise_videos_select_mentoria" ON public.exercise_videos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'aluno_mentoria'));
CREATE POLICY "exercise_videos_admin_write" ON public.exercise_videos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER exercise_videos_touch BEFORE UPDATE ON public.exercise_videos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.user_gym_preference (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_gym_preference TO authenticated;
GRANT ALL ON public.user_gym_preference TO service_role;
ALTER TABLE public.user_gym_preference ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gym_pref_own" ON public.user_gym_preference FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER user_gym_preference_touch BEFORE UPDATE ON public.user_gym_preference FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.student_plan_exercises ADD COLUMN IF NOT EXISTS exercise_id uuid REFERENCES public.exercises(id) ON DELETE SET NULL;

-- Políticas de arquivos dos vídeos
CREATE POLICY "exercise_videos_storage_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'exercise-videos' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'aluno_mentoria')));
CREATE POLICY "exercise_videos_storage_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exercise-videos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "exercise_videos_storage_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'exercise-videos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "exercise_videos_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'exercise-videos' AND public.has_role(auth.uid(), 'admin'));
