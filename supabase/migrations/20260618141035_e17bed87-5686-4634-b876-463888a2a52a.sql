
-- Add video_path and thumbnail_path columns to workouts (object storage paths)
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS video_path text,
  ADD COLUMN IF NOT EXISTS thumbnail_path text;

-- Storage RLS for workout-videos and workout-thumbnails
-- Admin can manage all objects in both buckets
CREATE POLICY "Admins manage workout-videos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'workout-videos' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'workout-videos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage workout-thumbnails"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'workout-thumbnails' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'workout-thumbnails' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Students with has_class_access can read thumbnails (for inline display via signed URL)
CREATE POLICY "Students with access read workout-thumbnails"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'workout-thumbnails'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.has_class_access = true)
  );

-- Students with has_class_access can read videos (signed URL playback)
CREATE POLICY "Students with access read workout-videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'workout-videos'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.has_class_access = true)
  );
