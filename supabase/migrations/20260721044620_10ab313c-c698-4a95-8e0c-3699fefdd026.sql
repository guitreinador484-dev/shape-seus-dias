
CREATE POLICY "Admins full access course-assets" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'course-assets' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'course-assets' AND public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read course-assets" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-assets');
