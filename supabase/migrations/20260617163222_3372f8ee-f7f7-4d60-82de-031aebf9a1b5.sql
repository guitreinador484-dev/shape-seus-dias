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
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'online')::public.app_role;
  END IF;

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
END $function$;