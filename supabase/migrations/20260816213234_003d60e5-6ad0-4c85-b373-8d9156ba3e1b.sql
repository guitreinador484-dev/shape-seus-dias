-- 20260810110000_nutrition.sql
-- Planos alimentares por aluno: plano -> refeições -> alimentos/macros.

CREATE TABLE public.nutrition_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nutrition_plans TO authenticated;
GRANT ALL ON public.nutrition_plans TO service_role;
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read own nutrition plans" ON public.nutrition_plans
  FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Admins manage nutrition plans" ON public.nutrition_plans
  FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

CREATE TABLE public.nutrition_meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.nutrition_plans(id) ON DELETE CASCADE,
  meal_label TEXT NOT NULL,
  meal_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);
GRANT SELECT ON public.nutrition_meals TO authenticated;
GRANT ALL ON public.nutrition_meals TO service_role;
ALTER TABLE public.nutrition_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read own meals" ON public.nutrition_meals
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.nutrition_plans p WHERE p.id = plan_id AND p.student_id = auth.uid())
  );
CREATE POLICY "Admins manage meals" ON public.nutrition_meals
  FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

CREATE TABLE public.nutrition_items (
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

CREATE TRIGGER trg_nutrition_plans_updated BEFORE UPDATE ON public.nutrition_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();