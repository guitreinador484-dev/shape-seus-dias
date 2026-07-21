
-- Fix courses admin policies to use app_private.is_admin (authenticated has EXECUTE)
DROP POLICY IF EXISTS "Admins manage courses" ON public.courses;
CREATE POLICY "Admins manage courses" ON public.courses FOR ALL TO authenticated
  USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage modules" ON public.course_modules;
CREATE POLICY "Admins manage modules" ON public.course_modules FOR ALL TO authenticated
  USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage lessons" ON public.course_lessons;
CREATE POLICY "Admins manage lessons" ON public.course_lessons FOR ALL TO authenticated
  USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage materials" ON public.lesson_materials;
CREATE POLICY "Admins manage materials" ON public.lesson_materials FOR ALL TO authenticated
  USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage enrollments" ON public.course_enrollments;
CREATE POLICY "Admins manage enrollments" ON public.course_enrollments FOR ALL TO authenticated
  USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage comments" ON public.lesson_comments;
CREATE POLICY "Admins manage comments" ON public.lesson_comments FOR ALL TO authenticated
  USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins view all progress" ON public.lesson_progress;
CREATE POLICY "Admins view all progress" ON public.lesson_progress FOR SELECT TO authenticated
  USING (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage certificates all" ON public.course_certificates;
CREATE POLICY "Admins manage certificates all" ON public.course_certificates FOR ALL TO authenticated
  USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users read own certificates" ON public.course_certificates;
CREATE POLICY "Users read own certificates" ON public.course_certificates FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR app_private.is_admin(auth.uid()));

-- Storage: course-assets admin access
DROP POLICY IF EXISTS "Admins full access course-assets" ON storage.objects;
CREATE POLICY "Admins full access course-assets" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'course-assets' AND app_private.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'course-assets' AND app_private.is_admin(auth.uid()));
