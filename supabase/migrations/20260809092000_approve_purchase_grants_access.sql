-- 20260809092000_approve_purchase_grants_access.sql
-- Quando uma venda (purchase) é aprovada/paga, o aluno vinculado ganha acesso.
-- Quando perde o status aprovado (cancelado/reembolsado/pendente), revoga acesso
-- apenas se o aluno não tiver outra venda aprovada/paga.
-- Cobre tanto a aprovação manual no painel admin quanto a futura integração de
-- gateway (webhook que registra a venda como approved/paid).

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

  -- Venda aprovada/paga libera o acesso na hora.
  IF granted THEN
    UPDATE public.profiles
    SET has_class_access = true
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

DROP TRIGGER IF EXISTS trg_purchases_sync_access ON public.purchases;

CREATE TRIGGER trg_purchases_sync_access
AFTER INSERT OR UPDATE OF status OR DELETE ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.sync_access_from_purchases();
