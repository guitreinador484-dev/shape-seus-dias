ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_status_check;

UPDATE public.leads
SET status = CASE status
  WHEN 'em-contato' THEN 'contato'
  WHEN 'qualificado' THEN 'interessado'
  WHEN 'convertido' THEN 'aluno'
  WHEN 'nao-qualificado' THEN 'lead'
  ELSE status
END;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('lead', 'contato', 'interessado', 'oferta', 'compra', 'aluno'));

ALTER TABLE public.leads
  ALTER COLUMN status SET DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS stage_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email_lower ON public.leads(lower(email)) WHERE email IS NOT NULL;

GRANT SELECT ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;