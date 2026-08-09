-- 20260810140000_referrals.sql
-- Programa de indicação: cada aluno ganha um código único para compartilhar,
-- e novos cadastros com esse código ficam vinculados ao indicador.

ALTER TABLE public.profiles ADD COLUMN referral_code TEXT;
ALTER TABLE public.profiles ADD COLUMN referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill: código único de 8 chars para todos os perfis existentes.
UPDATE public.profiles SET referral_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

ALTER TABLE public.profiles ALTER COLUMN referral_code SET NOT NULL;
CREATE UNIQUE INDEX profiles_referral_code_key ON public.profiles (referral_code);
CREATE INDEX idx_profiles_referred_by ON public.profiles (referred_by);

-- Gera o código na criação de usuário e vincula a indicação vinda do cliente
-- (referral_code do indicador em raw_user_meta_data->>'referred_by').
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
  v_has_access BOOLEAN;
  v_ref_code TEXT;
BEGIN
  IF NEW.email = 'guitreinador484@gmail.com' THEN
    v_role := 'admin'::public.app_role;
    v_has_access := true;
  ELSE
    -- Nunca confiar em raw_user_meta_data->>'role' vindo do cliente.
    v_role := 'online'::public.app_role;
    v_has_access := false;
  END IF;

  LOOP
    v_ref_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_ref_code);
  END LOOP;

  INSERT INTO public.profiles (id, email, full_name, whatsapp, has_class_access, referral_code, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'whatsapp',
    v_has_access,
    v_ref_code,
    (SELECT id FROM public.profiles WHERE referral_code = NEW.raw_user_meta_data->>'referred_by')
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END $function$;
