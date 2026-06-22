CREATE SCHEMA IF NOT EXISTS app_private;

REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT USAGE ON SCHEMA app_private TO service_role;

CREATE OR REPLACE FUNCTION app_private.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::public.app_role
  )
$$;

REVOKE ALL ON FUNCTION app_private.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_admin(uuid) TO service_role;

DROP POLICY IF EXISTS "Admins manage anamnese" ON public.anamnese;
CREATE POLICY "Admins manage anamnese"
ON public.anamnese
FOR ALL
TO authenticated
USING (app_private.is_admin(auth.uid()))
WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins delete profiles" ON public.profiles;
CREATE POLICY "Admins delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins insert profiles" ON public.profiles;
CREATE POLICY "Admins insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
CREATE POLICY "Admins update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (app_private.is_admin(auth.uid()))
WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage purchases" ON public.purchases;
CREATE POLICY "Admins manage purchases"
ON public.purchases
FOR ALL
TO authenticated
USING (app_private.is_admin(auth.uid()))
WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage quiz_config" ON public.quiz_config;
CREATE POLICY "Admins manage quiz_config"
ON public.quiz_config
FOR ALL
TO authenticated
USING (app_private.is_admin(auth.uid()))
WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage exercises" ON public.student_plan_exercises;
CREATE POLICY "Admins manage exercises"
ON public.student_plan_exercises
FOR ALL
TO authenticated
USING (app_private.is_admin(auth.uid()))
WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage plans" ON public.student_plans;
CREATE POLICY "Admins manage plans"
ON public.student_plans
FOR ALL
TO authenticated
USING (app_private.is_admin(auth.uid()))
WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins delete roles" ON public.user_roles;
CREATE POLICY "Admins delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins insert roles" ON public.user_roles;
CREATE POLICY "Admins insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read all roles" ON public.user_roles;
CREATE POLICY "Admins read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins update roles" ON public.user_roles;
CREATE POLICY "Admins update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (app_private.is_admin(auth.uid()))
WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage workout_exercises" ON public.workout_exercises;
CREATE POLICY "Admins manage workout_exercises"
ON public.workout_exercises
FOR ALL
TO authenticated
USING (app_private.is_admin(auth.uid()))
WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage workouts" ON public.workouts;
CREATE POLICY "Admins manage workouts"
ON public.workouts
FOR ALL
TO authenticated
USING (app_private.is_admin(auth.uid()))
WITH CHECK (app_private.is_admin(auth.uid()));