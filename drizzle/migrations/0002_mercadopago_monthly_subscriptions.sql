ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS billing_type text NOT NULL DEFAULT 'one_time';
CREATE TABLE public.billing_settings (id boolean PRIMARY KEY DEFAULT true CHECK (id), enabled boolean NOT NULL DEFAULT false, verified_at timestamptz, test_subscription_id text, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.billing_settings TO authenticated;
GRANT ALL ON public.billing_settings TO service_role;
ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_settings_admin_read ON public.billing_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TABLE public.subscriptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reference uuid NOT NULL UNIQUE, purchase_id uuid REFERENCES public.purchases(id), user_id uuid, provider_id text UNIQUE, customer_email text NOT NULL, customer_name text, plan_id text NOT NULL, plan_name text NOT NULL, amount numeric(12,2) NOT NULL CHECK(amount > 0), currency text NOT NULL DEFAULT 'BRL', order_bump_ids text[] NOT NULL DEFAULT '{}', unlock_nutrition boolean NOT NULL DEFAULT false, unlock_videos boolean NOT NULL DEFAULT false, status text NOT NULL DEFAULT 'pending', current_period_end timestamptz, canceled_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscriptions_read ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX subscriptions_user_idx ON public.subscriptions(user_id);
CREATE TABLE public.subscription_payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subscription_id uuid NOT NULL REFERENCES public.subscriptions(id), provider_payment_id text NOT NULL UNIQUE, amount numeric(12,2) NOT NULL, status text NOT NULL, paid_at timestamptz NOT NULL, period_end timestamptz, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscription_payments_read ON public.subscription_payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id=subscription_id AND (s.user_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE TABLE public.subscription_access_baselines (user_id uuid PRIMARY KEY, had_access boolean NOT NULL, expires_at timestamptz, captured_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.subscription_access_baselines TO service_role;
ALTER TABLE public.subscription_access_baselines ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.apply_subscription_payment(_subscription_id uuid, _payment_id text, _amount numeric, _paid_at timestamptz) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.subscriptions; e timestamptz; baseline public.subscription_access_baselines;
BEGIN
 SELECT * INTO s FROM public.subscriptions WHERE id=_subscription_id FOR UPDATE;
 IF NOT FOUND OR s.user_id IS NULL OR s.amount <> _amount THEN RAISE EXCEPTION 'Invalid subscription payment'; END IF;
 IF EXISTS(SELECT 1 FROM public.subscription_payments WHERE provider_payment_id=_payment_id) THEN RETURN false; END IF;
 e := GREATEST(COALESCE(s.current_period_end,_paid_at),_paid_at) + interval '1 month';
 INSERT INTO public.subscription_payments(subscription_id,provider_payment_id,amount,status,paid_at,period_end) VALUES(s.id,_payment_id,_amount,'approved',_paid_at,e);
 UPDATE public.subscriptions SET current_period_end=e,updated_at=now() WHERE id=s.id;
 SELECT * INTO baseline FROM public.subscription_access_baselines WHERE user_id=s.user_id;
 UPDATE public.profiles SET has_class_access=true, access_expires_at=CASE WHEN baseline.had_access AND baseline.expires_at IS NULL THEN NULL ELSE GREATEST(COALESCE(access_expires_at,e),e,baseline.expires_at) END, has_nutrition_access=has_nutrition_access OR s.unlock_nutrition, has_video_access=has_video_access OR s.unlock_videos,updated_at=now() WHERE id=s.user_id;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.apply_subscription_payment(uuid,text,numeric,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_subscription_payment(uuid,text,numeric,timestamptz) TO service_role;
CREATE OR REPLACE FUNCTION public.sync_access_from_purchases() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE has_active boolean; uid uuid; granted boolean;
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.billing_type='subscription' THEN RETURN NULL; END IF;
  uid:=OLD.user_id; granted:=OLD.status IN ('approved','paid');
 ELSE
  IF NEW.billing_type='subscription' THEN RETURN NULL; END IF;
  uid:=NEW.user_id; granted:=NEW.status IN ('approved','paid');
 END IF;
 IF uid IS NULL THEN RETURN NULL; END IF;
 IF granted THEN UPDATE public.profiles SET has_class_access=true,access_expires_at=GREATEST(COALESCE(access_expires_at,now()),now())+interval '90 days' WHERE id=uid; RETURN NULL; END IF;
 SELECT EXISTS(SELECT 1 FROM public.purchases WHERE user_id=uid AND status IN ('approved','paid') AND billing_type='one_time') OR EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id=uid AND current_period_end>now()) INTO has_active;
 IF NOT has_active THEN UPDATE public.profiles SET has_class_access=false WHERE id=uid; END IF;
 RETURN NULL;
END; $$;