-- 20260809090000_fix_signup_access.sql
-- Fecha dois vetores de vulnerabilidade no signup:
--   1) Self-signup NÃO concede mais acesso pago: has_class_access = false por padrão.
--   2) O role não é mais derivado de raw_user_meta_data->>'role' (controlado pelo
--      cliente), o que impedia a escalação para 'admin'/'presencial' via signup.
-- A liberação de acesso/roles passa a ser feita apenas por server function
-- (createStudent) ou manualmente pelo admin.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
  v_has_access BOOLEAN;
BEGIN
  IF NEW.email = 'guitreinador484@gmail.com' THEN
    v_role := 'admin'::public.app_role;
    v_has_access := true;
  ELSE
    -- Nunca confiar em raw_user_meta_data->>'role' vindo do cliente.
    -- Novo usuário nasce como 'online' SEM acesso; a liberação acontece
    -- via createStudent (server function) ou manualmente no admin.
    v_role := 'online'::public.app_role;
    v_has_access := false;
  END IF;

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
END $function$;
