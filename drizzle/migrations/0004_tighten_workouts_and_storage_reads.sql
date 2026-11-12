DROP POLICY IF EXISTS "Anyone reads workouts" ON public.workouts;
CREATE POLICY "Entitled users read workouts" ON public.workouts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'::public.app_role) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_active AND (p.has_class_access OR p.has_video_access)));

DROP POLICY IF EXISTS "Anyone reads workout_exercises" ON public.workout_exercises;
CREATE POLICY "Entitled users read workout_exercises" ON public.workout_exercises FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id));

DROP POLICY IF EXISTS "funnel_assets_public_read" ON storage.objects;
CREATE POLICY "funnel_assets_published_read" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'funnel-assets' AND (
  public.has_role(auth.uid(),'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.quiz_config q WHERE q.section LIKE 'funnel:%' AND position(('funnel://' || storage.objects.name) in q.content::text) > 0)
));

DROP POLICY IF EXISTS "Course assets read for enrolled or admin" ON storage.objects;
CREATE POLICY "Course assets read for enrolled or admin" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'course-assets' AND (
  public.has_role(auth.uid(),'admin'::public.app_role)
  OR ((storage.foldername(name))[2] = 'covers' AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id::text = (storage.foldername(name))[1] AND c.is_published))
  OR EXISTS (SELECT 1 FROM public.course_enrollments ce WHERE ce.user_id = auth.uid() AND ce.course_id::text = (storage.foldername(name))[1])
));