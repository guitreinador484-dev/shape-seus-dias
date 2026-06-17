-- Prevent privilege escalation: only admins may write to user_roles.
-- The handle_new_user() trigger runs as SECURITY DEFINER and bypasses RLS,
-- so signup still assigns the default role correctly.

CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
