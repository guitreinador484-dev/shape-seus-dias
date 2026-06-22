
-- Revoke EXECUTE on SECURITY DEFINER functions from public/anon/authenticated.
-- These functions are used internally by RLS/triggers and don't need to be callable via the API.
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Fix profiles UPDATE policy: add WITH CHECK preventing privilege escalation
-- (users must not be able to change email, has_class_access, or is_active on themselves)
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND email IS NOT DISTINCT FROM (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid())
  AND has_class_access IS NOT DISTINCT FROM (SELECT p.has_class_access FROM public.profiles p WHERE p.id = auth.uid())
  AND is_active IS NOT DISTINCT FROM (SELECT p.is_active FROM public.profiles p WHERE p.id = auth.uid())
);
