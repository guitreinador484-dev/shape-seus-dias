-- 20260809091000_create_leads.sql
-- Tabela de leads capturados no quiz/funil. Persistência em servidor para que
-- o admin enxergue leads reais de visitantes (não apenas o localStorage do navegador).
-- INSERT/UPDATE/DELETE são feitos apenas via server functions (service role);
-- o cliente não tem permissão de escrita direta.

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

-- Apenas administradores podem listar leads.
CREATE POLICY "Leads admin select" ON public.leads
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
    )
  );

-- Sem policies de INSERT/UPDATE/DELETE: escrita exclusiva via service role.
GRANT SELECT ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
