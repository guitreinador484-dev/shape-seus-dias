-- 20260809093000_course_assets_rls_by_enrollment.sql
-- CORREÇÃO DE SEGURANÇA: antes, qualquer aluno com 1 matrícula podia ler TODOS
-- os objetos do bucket course-assets (vídeos de todos os cursos).
--
-- Novos assets são salvos em '{course_id}/{subfolder}/{arquivo}' (ver
-- src/lib/courses-api.ts -> uploadCourseAsset). Esta migration:
--   1) Restringe a policy de SELECT para exigir matrícula no curso dono do asset.
--   2) Move assets legados (covers/, videos/, thumbs/, materials/) para a pasta
--      do curso correspondente e atualiza as referências no banco.

-- 1) Nova policy scoped por matrícula -------------------------------------------
DROP POLICY IF EXISTS "Course assets read for enrolled or admin" ON storage.objects;

CREATE POLICY "Course assets read for enrolled or admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'course-assets'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.course_enrollments ce
      WHERE ce.user_id = auth.uid()
        AND ce.course_id::text = (storage.foldername(name))[1]
    )
  )
);

-- 2) Backfill: move assets legados para a pasta do curso -------------------------
-- Capas de cursos
DO $$
DECLARE
  r record;
  src text;
  dst text;
BEGIN
  FOR r IN
    SELECT id, cover_path FROM public.courses
    WHERE cover_path IS NOT NULL AND split_part(cover_path, '/', 1) = 'covers'
  LOOP
    src := r.cover_path;
    dst := r.id || '/' || r.cover_path;
    IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'course-assets' AND name = src)
       AND NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'course-assets' AND name = dst) THEN
      PERFORM storage.move('course-assets', src, dst);
    END IF;
    UPDATE public.courses SET cover_path = dst WHERE id = r.id;
  END LOOP;
END $$;

-- Vídeos e thumbnails de aulas
DO $$
DECLARE
  r record;
  src text;
  dst text;
BEGIN
  FOR r IN
    SELECT l.id, l.video_path, l.thumbnail_path, m.course_id
    FROM public.course_lessons l
    JOIN public.course_modules m ON m.id = l.module_id
  LOOP
    IF r.video_path IS NOT NULL AND split_part(r.video_path, '/', 1) = 'videos' THEN
      src := r.video_path;
      dst := r.course_id || '/' || r.video_path;
      IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'course-assets' AND name = src)
         AND NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'course-assets' AND name = dst) THEN
        PERFORM storage.move('course-assets', src, dst);
      END IF;
      UPDATE public.course_lessons SET video_path = dst WHERE id = r.id;
    END IF;

    IF r.thumbnail_path IS NOT NULL AND split_part(r.thumbnail_path, '/', 1) = 'thumbs' THEN
      src := r.thumbnail_path;
      dst := r.course_id || '/' || r.thumbnail_path;
      IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'course-assets' AND name = src)
         AND NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'course-assets' AND name = dst) THEN
        PERFORM storage.move('course-assets', src, dst);
      END IF;
      UPDATE public.course_lessons SET thumbnail_path = dst WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- Materiais de aula
DO $$
DECLARE
  r record;
  src text;
  dst text;
BEGIN
  FOR r IN
    SELECT lm.id, lm.file_path, m.course_id
    FROM public.lesson_materials lm
    JOIN public.course_lessons l ON l.id = lm.lesson_id
    JOIN public.course_modules m ON m.id = l.module_id
    WHERE lm.file_path IS NOT NULL AND split_part(lm.file_path, '/', 1) = 'materials'
  LOOP
    src := r.file_path;
    dst := r.course_id || '/' || r.file_path;
    IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'course-assets' AND name = src)
       AND NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'course-assets' AND name = dst) THEN
      PERFORM storage.move('course-assets', src, dst);
    END IF;
    UPDATE public.lesson_materials SET file_path = dst WHERE id = r.id;
  END LOOP;
END $$;
