-- ============================================================
-- APLICAR NO SUPABASE: SQL Editor  (supabase.com/dashboard)
-- Cola tudo isto no editor e clica em "Run".
-- O script é idempotente: se algo já existir, não quebra.
-- ============================================================

-- 1) ACESSO COM VALIDADE (20260810100000)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_expires_at timestamptz;

CREATE OR REPLACE FUNCTION public.sync_access_from_purchases()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_active boolean;
  uid uuid;
  granted boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    uid := OLD.user_id;
    granted := OLD.status IN ('approved', 'paid');
  ELSE
    uid := NEW.user_id;
    granted := NEW.status IN ('approved', 'paid');
  END IF;

  IF uid IS NULL THEN
    RETURN NULL;
  END IF;

  IF granted THEN
    UPDATE public.profiles
    SET has_class_access = true,
        access_expires_at = GREATEST(COALESCE(access_expires_at, now()), now()) + INTERVAL '90 days'
    WHERE id = uid;
    RETURN NULL;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.purchases
    WHERE user_id = uid AND status IN ('approved', 'paid')
  ) INTO has_active;

  IF NOT has_active THEN
    UPDATE public.profiles
    SET has_class_access = false
    WHERE id = uid;
  END IF;

  RETURN NULL;
END;
$$;

-- ============================================================
-- 2) NUTRIÇÃO (20260810110000)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nutrition_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nutrition_plans TO authenticated;
GRANT ALL ON public.nutrition_plans TO service_role;
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students read own nutrition plans" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Admins manage nutrition plans" ON public.nutrition_plans;
CREATE POLICY "Students read own nutrition plans" ON public.nutrition_plans
  FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Admins manage nutrition plans" ON public.nutrition_plans
  FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.nutrition_meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.nutrition_plans(id) ON DELETE CASCADE,
  meal_label TEXT NOT NULL,
  meal_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);
GRANT SELECT ON public.nutrition_meals TO authenticated;
GRANT ALL ON public.nutrition_meals TO service_role;
ALTER TABLE public.nutrition_meals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students read own meals" ON public.nutrition_meals;
DROP POLICY IF EXISTS "Admins manage meals" ON public.nutrition_meals;
CREATE POLICY "Students read own meals" ON public.nutrition_meals
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.nutrition_plans p WHERE p.id = plan_id AND p.student_id = auth.uid())
  );
CREATE POLICY "Admins manage meals" ON public.nutrition_meals
  FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.nutrition_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_id UUID NOT NULL REFERENCES public.nutrition_meals(id) ON DELETE CASCADE,
  food TEXT NOT NULL,
  amount TEXT,
  calories NUMERIC(8,2),
  protein NUMERIC(8,2),
  carbs NUMERIC(8,2),
  fat NUMERIC(8,2),
  display_order INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT ON public.nutrition_items TO authenticated;
GRANT ALL ON public.nutrition_items TO service_role;
ALTER TABLE public.nutrition_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students read own items" ON public.nutrition_items;
DROP POLICY IF EXISTS "Admins manage items" ON public.nutrition_items;
CREATE POLICY "Students read own items" ON public.nutrition_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.nutrition_plans p
      JOIN public.nutrition_meals m ON m.plan_id = p.id
      WHERE m.id = meal_id AND p.student_id = auth.uid()
    )
  );
CREATE POLICY "Admins manage items" ON public.nutrition_items
  FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_nutrition_plans_updated ON public.nutrition_plans;
CREATE TRIGGER trg_nutrition_plans_updated BEFORE UPDATE ON public.nutrition_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- 3) EVOLUÇÃO / MEDIDAS + FOTOS (20260810120000)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.body_measurements (
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
CREATE INDEX IF NOT EXISTS idx_body_measurements_user ON public.body_measurements (user_id, measured_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_measurements TO authenticated;
GRANT ALL ON public.body_measurements TO service_role;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own measurements" ON public.body_measurements;
DROP POLICY IF EXISTS "Admins manage measurements" ON public.body_measurements;
CREATE POLICY "Users manage own measurements" ON public.body_measurements
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage measurements" ON public.body_measurements
  FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

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

-- ============================================================
-- 4) CHECK-INS DIÁRIOS + STREAK (20260810130000)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.checkins (
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
CREATE INDEX IF NOT EXISTS idx_checkins_user ON public.checkins (user_id, checkin_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkins TO authenticated;
GRANT ALL ON public.checkins TO service_role;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own checkins" ON public.checkins;
DROP POLICY IF EXISTS "Admins read all checkins" ON public.checkins;
CREATE POLICY "Users manage own checkins" ON public.checkins
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all checkins" ON public.checkins
  FOR SELECT TO authenticated USING (app_private.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_checkins_updated ON public.checkins;
CREATE TRIGGER trg_checkins_updated BEFORE UPDATE ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- 5) INDICAÇÃO + WHATSAPP (20260810140000)
-- ============================================================
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
