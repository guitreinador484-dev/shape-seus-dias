-- 20260809091000_create_leads.sql
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'quiz' CHECK (source IN ('quiz', 'funil')),
  quiz_slug text,
  quiz_title text,
  name text,
  email text,
  whatsapp text,
  score numeric,
  profile text,
  status text NOT NULL DEFAULT 'qualificado' CHECK (status IN ('qualificado', 'em-contato', 'convertido', 'nao-qualificado')),
  plan_id text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads (created_at DESC);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leads admin select" ON public.leads
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
    )
  );

GRANT SELECT ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

-- 20260809094000_persist_training_progress.sql
ALTER TABLE public.student_plan_exercises
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

DROP POLICY IF EXISTS "Students complete own exercises" ON public.student_plan_exercises;
CREATE POLICY "Students complete own exercises" ON public.student_plan_exercises
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.student_plans p WHERE p.id = plan_id AND p.student_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.guard_student_plan_exercise_edits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

DROP POLICY IF EXISTS "Users manage own workout progress" ON public.workout_progress;
CREATE POLICY "Users manage own workout progress" ON public.workout_progress
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 20260810130000_checkins.sql
CREATE TABLE public.checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  treino_done BOOLEAN NOT NULL DEFAULT false,
  diet_done BOOLEAN NOT NULL DEFAULT false,
  mood SMALLINT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)
);
CREATE INDEX idx_checkins_user ON public.checkins (user_id, checkin_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkins TO authenticated;
GRANT ALL ON public.checkins TO service_role;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own checkins" ON public.checkins
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all checkins" ON public.checkins
  FOR SELECT TO authenticated USING (app_private.is_admin(auth.uid()));

CREATE TRIGGER trg_checkins_updated BEFORE UPDATE ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 20260810140000_referrals.sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.profiles SET referral_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

ALTER TABLE public.profiles ALTER COLUMN referral_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key ON public.profiles (referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles (referred_by);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
  v_has_access BOOLEAN;
  v_ref_code TEXT;
BEGIN
  IF NEW.email = 'guitreinador484@gmail.com' THEN
    v_role := 'admin'::public.app_role;
    v_has_access := true;
  ELSE
    v_role := 'online'::public.app_role;
    v_has_access := false;
  END IF;

  LOOP
    v_ref_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_ref_code);
  END LOOP;

  INSERT INTO public.profiles (id, email, full_name, whatsapp, has_class_access, referral_code, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'whatsapp',
    v_has_access,
    v_ref_code,
    (SELECT id FROM public.profiles WHERE referral_code = NEW.raw_user_meta_data->>'referred_by')
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END $function$;