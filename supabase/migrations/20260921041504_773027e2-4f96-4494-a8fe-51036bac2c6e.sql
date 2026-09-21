ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS welcome_completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_welcome_purchase_id
  ON public.profiles(welcome_purchase_id);

CREATE TABLE public.feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feedback_type text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedbacks_type_valid CHECK (feedback_type IN ('sugestao', 'critica', 'elogio', 'outro')),
  CONSTRAINT feedbacks_status_valid CHECK (status IN ('novo', 'lido', 'resolvido')),
  CONSTRAINT feedbacks_message_length CHECK (char_length(btrim(message)) BETWEEN 3 AND 2000)
);

GRANT SELECT, INSERT ON public.feedbacks TO authenticated;
GRANT UPDATE, DELETE ON public.feedbacks TO authenticated;
GRANT ALL ON public.feedbacks TO service_role;

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes enviam feedback proprio"
ON public.feedbacks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clientes leem feedback proprio"
ON public.feedbacks FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Administradores atualizam feedbacks"
ON public.feedbacks FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Administradores excluem feedbacks"
ON public.feedbacks FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX idx_feedbacks_user_created ON public.feedbacks(user_id, created_at DESC);
CREATE INDEX idx_feedbacks_status_created ON public.feedbacks(status, created_at DESC);

CREATE TRIGGER trg_feedbacks_updated
BEFORE UPDATE ON public.feedbacks
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.nutrition_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  favorite_foods text,
  disliked_foods text,
  dietary_restrictions text,
  food_allergies text,
  eating_routine text,
  avoided_foods text,
  nutrition_goal text,
  source_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nutrition_intake_favorite_length CHECK (favorite_foods IS NULL OR char_length(favorite_foods) <= 1000),
  CONSTRAINT nutrition_intake_disliked_length CHECK (disliked_foods IS NULL OR char_length(disliked_foods) <= 1000),
  CONSTRAINT nutrition_intake_restrictions_length CHECK (dietary_restrictions IS NULL OR char_length(dietary_restrictions) <= 1000),
  CONSTRAINT nutrition_intake_allergies_length CHECK (food_allergies IS NULL OR char_length(food_allergies) <= 1000),
  CONSTRAINT nutrition_intake_routine_length CHECK (eating_routine IS NULL OR char_length(eating_routine) <= 1500),
  CONSTRAINT nutrition_intake_avoided_length CHECK (avoided_foods IS NULL OR char_length(avoided_foods) <= 1000),
  CONSTRAINT nutrition_intake_goal_length CHECK (nutrition_goal IS NULL OR char_length(nutrition_goal) <= 1000)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_intake TO authenticated;
GRANT ALL ON public.nutrition_intake TO service_role;

ALTER TABLE public.nutrition_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes leem informacoes alimentares proprias"
ON public.nutrition_intake FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Clientes criam informacoes alimentares proprias"
ON public.nutrition_intake FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Clientes atualizam informacoes alimentares proprias"
ON public.nutrition_intake FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Administradores excluem informacoes alimentares"
ON public.nutrition_intake FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX idx_nutrition_intake_source_lead ON public.nutrition_intake(source_lead_id);

CREATE TRIGGER trg_nutrition_intake_updated
BEFORE UPDATE ON public.nutrition_intake
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();