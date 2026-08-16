-- 20260810100000_access_expiry.sql
-- Alunos podem ter acesso com validade (premissa: programa de 3 meses).
-- NULL = acesso sem prazo definido.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_expires_at timestamptz;

-- Aprovar/pagar uma venda libera o acesso imediatamente e renova a validade
-- em 90 dias a partir de agora (compra = renovação do programa).
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

  -- Venda aprovada/paga libera o acesso na hora e renova por mais 90 dias.
  IF granted THEN
    UPDATE public.profiles
    SET has_class_access = true,
        access_expires_at = GREATEST(COALESCE(access_expires_at, now()), now()) + INTERVAL '90 days'
    WHERE id = uid;
    RETURN NULL;
  END IF;

  -- Status sem acesso (canceled/refunded/pending) ou exclusão de venda:
  -- revoga somente se não houver outra venda aprovada/paga.
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