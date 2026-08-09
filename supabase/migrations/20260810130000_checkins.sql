-- 20260810130000_checkins.sql
-- Check-ins diários do aluno (treino/dieta/humor) para engajamento e streak.

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
