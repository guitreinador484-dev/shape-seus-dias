ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS account_created boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.apply_subscription_payment(_subscription_id uuid, _payment_id text, _amount numeric, _paid_at timestamptz) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.subscriptions; e timestamptz; baseline public.subscription_access_baselines;
BEGIN
 SELECT * INTO s FROM public.subscriptions WHERE id=_subscription_id FOR UPDATE;
 IF NOT FOUND OR s.user_id IS NULL OR s.amount <> _amount THEN RAISE EXCEPTION 'Invalid subscription payment'; END IF;
 IF EXISTS(SELECT 1 FROM public.subscription_payments WHERE provider_payment_id=_payment_id) THEN RETURN false; END IF;
 e := _paid_at + interval '1 month';
 INSERT INTO public.subscription_payments(subscription_id,provider_payment_id,amount,status,paid_at,period_end) VALUES(s.id,_payment_id,_amount,'approved',_paid_at,e);
 UPDATE public.subscriptions SET current_period_end=GREATEST(current_period_end,e),updated_at=now() WHERE id=s.id;
 SELECT * INTO baseline FROM public.subscription_access_baselines WHERE user_id=s.user_id;
 UPDATE public.profiles SET has_class_access=true,access_expires_at=CASE WHEN baseline.had_access AND baseline.expires_at IS NULL THEN NULL ELSE GREATEST(COALESCE(access_expires_at,e),e,baseline.expires_at) END,has_nutrition_access=has_nutrition_access OR s.unlock_nutrition,has_video_access=has_video_access OR s.unlock_videos,updated_at=now() WHERE id=s.user_id;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.apply_subscription_payment(uuid,text,numeric,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_subscription_payment(uuid,text,numeric,timestamptz) TO service_role;