
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'online', 'presencial');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  whatsapp TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  has_class_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER_ROLES ============
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'admin'::public.app_role) $$;

-- Policies for profiles
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Policies for user_roles
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- ============ ANAMNESE ============
CREATE TABLE public.anamnese (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  objetivo TEXT,
  frequencia TEXT,
  experiencia TEXT,
  limitacao TEXT,
  limitacao_descricao TEXT,
  local_treino TEXT,
  quiz_answers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anamnese TO authenticated;
GRANT ALL ON public.anamnese TO service_role;
ALTER TABLE public.anamnese ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own anamnese" ON public.anamnese FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own anamnese" ON public.anamnese FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own anamnese" ON public.anamnese FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage anamnese" ON public.anamnese FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ PURCHASES ============
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  appmax_order_id TEXT,
  transaction_id TEXT,
  customer_email TEXT,
  customer_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own purchases" ON public.purchases FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage purchases" ON public.purchases FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ WORKOUTS ============
CREATE TABLE public.workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  thumbnail_url TEXT,
  video_url TEXT,
  description TEXT,
  difficulty TEXT,
  duration_minutes INTEGER,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workouts TO anon, authenticated;
GRANT ALL ON public.workouts TO service_role;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads workouts" ON public.workouts FOR SELECT USING (true);
CREATE POLICY "Admins manage workouts" ON public.workouts FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ WORKOUT EXERCISES ============
CREATE TABLE public.workout_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets TEXT,
  reps TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT ON public.workout_exercises TO anon, authenticated;
GRANT ALL ON public.workout_exercises TO service_role;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads workout_exercises" ON public.workout_exercises FOR SELECT USING (true);
CREATE POLICY "Admins manage workout_exercises" ON public.workout_exercises FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ STUDENT PLANS ============
CREATE TABLE public.student_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  plan_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, day_of_week)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_plans TO authenticated;
GRANT ALL ON public.student_plans TO service_role;
ALTER TABLE public.student_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read own plans" ON public.student_plans FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Admins manage plans" ON public.student_plans FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.student_plan_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.student_plans(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets TEXT,
  reps TEXT,
  rest_seconds INTEGER,
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_plan_exercises TO authenticated;
GRANT ALL ON public.student_plan_exercises TO service_role;
ALTER TABLE public.student_plan_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read own exercises" ON public.student_plan_exercises
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.student_plans p WHERE p.id = plan_id AND p.student_id = auth.uid())
  );
CREATE POLICY "Admins manage exercises" ON public.student_plan_exercises
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ QUIZ CONFIG ============
CREATE TABLE public.quiz_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quiz_config TO anon, authenticated;
GRANT ALL ON public.quiz_config TO service_role;
ALTER TABLE public.quiz_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads quiz_config" ON public.quiz_config FOR SELECT USING (true);
CREATE POLICY "Admins manage quiz_config" ON public.quiz_config FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ TIMESTAMPS TRIGGER ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_anamnese_updated BEFORE UPDATE ON public.anamnese
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_workouts_updated BEFORE UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_student_plans_updated BEFORE UPDATE ON public.student_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_quiz_config_updated BEFORE UPDATE ON public.quiz_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
  v_has_access BOOLEAN;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'online')::public.app_role;
  -- presencial defaults to false access; online/admin true
  v_has_access := CASE WHEN v_role = 'presencial' THEN false ELSE true END;

  INSERT INTO public.profiles (id, email, full_name, whatsapp, has_class_access)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'whatsapp',
    v_has_access
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ QUIZ CONFIG SEED ============
INSERT INTO public.quiz_config (section, content) VALUES
('hero', '{
  "headline": "Você está a 3 meses de alcançar o corpo que sempre quis — mas ainda não sabe disso.",
  "subheadline": "Responda 5 perguntas rápidas e descubra o plano de treino exato para a sua realidade — criado por um Personal Trainer de verdade.",
  "image_url": "",
  "proof_1": "+500 alunos transformados",
  "proof_2": "Personal Trainer certificado",
  "proof_3": "Acesso imediato após a compra",
  "cta_text": "👉 Quero descobrir meu plano agora"
}'::jsonb),
('pergunta1', '{
  "headline": "Qual é o seu maior objetivo agora?",
  "subtext": "Seja honesto — isso vai definir o seu plano personalizado",
  "options": [
    {"id":"emagrecer","icon":"🔥","title":"Emagrecer e definir o corpo","subtext":"Quero perder gordura e me sentir bem no espelho"},
    {"id":"massa","icon":"💪","title":"Ganhar massa e força","subtext":"Quero um corpo mais forte e volumoso"},
    {"id":"condicionamento","icon":"⚡","title":"Melhorar meu condicionamento","subtext":"Quero mais energia e disposição"},
    {"id":"transformacao","icon":"🌟","title":"Transformação completa","subtext":"Quero mudar corpo, saúde e autoestima"}
  ]
}'::jsonb),
('pergunta2', '{
  "headline": "Qual é a sua relação com os treinos hoje?",
  "subtext": "Não existe resposta certa — queremos montar algo que funcione pra você",
  "options": [
    {"id":"nunca","icon":"😅","title":"Nunca treinei de verdade","subtext":"Já tentei mas nunca me mantive"},
    {"id":"as_vezes","icon":"🔄","title":"Treino às vezes, sem consistência","subtext":"Começo com tudo e paro logo"},
    {"id":"sem_resultado","icon":"📅","title":"Treino mas sem resultado","subtext":"Me dedico mas o corpo não responde"},
    {"id":"serio","icon":"🚀","title":"Treino sério e quero evoluir","subtext":"Tenho base e quero acompanhamento profissional"}
  ]
}'::jsonb),
('pergunta3', '{
  "headline": "O que mais te impede de ter o corpo que você quer?",
  "subtext": "Isso é mais comum do que você imagina — e tem solução.",
  "options": [
    {"id":"motivacao","icon":"😩","title":"Falta de motivação","subtext":"Começo animado mas a empolgação vai embora"},
    {"id":"comecar","icon":"❓","title":"Não sei por onde começar","subtext":"Vi tanto conteúdo que fiquei mais confuso"},
    {"id":"tempo","icon":"⏰","title":"Falta de tempo","subtext":"Minha rotina é corrida demais"},
    {"id":"gastei","icon":"💸","title":"Já gastei e não tive resultado","subtext":"Tentei de tudo e nada funcionou"}
  ]
}'::jsonb),
('pergunta4', '{
  "headline": "Se você tivesse um plano 100% personalizado, se comprometeria por 3 meses?",
  "subtext": "Resultados reais pedem comprometimento real.",
  "yes_text": "Sim, estou pronto",
  "doubt_text": "Ainda tenho dúvidas",
  "modal_text": "Faz sentido ter dúvidas. Por isso criamos uma garantia de 7 dias: se não gostar, devolvemos 100%. Sem perguntas.",
  "modal_button": "Entendi, quero continuar"
}'::jsonb),
('resultado', '{
  "emagrecer": "Seu perfil está pronto! Você tem tudo para perder gordura nos próximos 3 meses.",
  "massa": "Seu perfil está pronto! Você tem o perfil ideal para ganhar massa com o método certo.",
  "condicionamento": "Seu perfil está pronto! Sua energia vai mudar nas primeiras semanas.",
  "transformacao": "Seu perfil está pronto! Você está no lugar certo para uma transformação completa."
}'::jsonb),
('beneficios', '{
  "items": [
    "Treinos personalizados para seu nível e objetivo",
    "Acesso à plataforma completa de aulas em vídeo",
    "Plano estruturado semana a semana por 3 meses",
    "Suporte via plataforma",
    "Acesso imediato após a compra",
    "Funciona em casa ou na academia",
    "Atualizações conforme você evolui"
  ]
}'::jsonb),
('depoimentos', '{
  "headline": "Veja quem já transformou o corpo:",
  "items": [
    {"id":"d1","photo":"","name":"Marina, 32","text":"Em 6 semanas já vi diferença no espelho. Nunca pensei que conseguiria.","badge":"Resultado em 6 semanas"},
    {"id":"d2","photo":"","name":"Rafael, 28","text":"Treino em casa todo dia. O suporte faz toda diferença.","badge":"-8kg em 3 meses"},
    {"id":"d3","photo":"","name":"Camila, 41","text":"Recuperei minha disposição e meu corpo. Recomendo demais.","badge":"Transformação completa"}
  ]
}'::jsonb),
('preco', '{
  "anchor_text": "Um personal presencial cobra em média R$150 por sessão — mais de R$1.800/mês.",
  "offer_headline": "Seu acesso completo por apenas:",
  "old_price": "R$297",
  "current_price": "R$97",
  "description": "Pagamento único — acesso por 3 meses completos",
  "timer_minutes": 15,
  "timer_text": "Após esse tempo, o valor volta ao preço original.",
  "show_timer": true
}'::jsonb),
('garantia', '{
  "title": "Garantia incondicional de 7 dias",
  "text": "Se por qualquer motivo não ficar satisfeito nos primeiros 7 dias, devolvemos 100% do seu dinheiro. Sem burocracia, sem perguntas."
}'::jsonb),
('cta', '{
  "button_text": "🚀 QUERO COMEÇAR AGORA — R$97",
  "subtext": "Acesso imediato • Pagamento seguro • Garantia de 7 dias"
}'::jsonb),
('faq', '{
  "items": [
    {"id":"f1","question":"Funciona para quem nunca treinou?","answer":"Sim! Temos módulos para iniciantes."},
    {"id":"f2","question":"Preciso de academia?","answer":"Funciona em casa ou na academia."},
    {"id":"f3","question":"Como funciona o acesso?","answer":"Imediatamente após pagamento você recebe os dados por email."},
    {"id":"f4","question":"E se eu não tiver resultado?","answer":"7 dias de garantia total. Devolvemos tudo."}
  ]
}'::jsonb);
