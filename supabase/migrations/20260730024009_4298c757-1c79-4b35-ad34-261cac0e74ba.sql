DROP POLICY IF EXISTS "Authenticated read course-assets" ON storage.objects;

CREATE POLICY "Course assets read for enrolled or admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'course-assets'
  AND (
    (storage.foldername(name))[1] = 'covers'
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.course_enrollments ce WHERE ce.user_id = auth.uid()
    )
  )
);