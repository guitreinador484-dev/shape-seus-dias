DROP POLICY IF EXISTS "exercise_videos_select_mentoria" ON public.exercise_videos;
CREATE POLICY "Clientes com treino veem videos de exercicios"
ON public.exercise_videos FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'aluno_mentoria'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.student_plans sp
    JOIN public.student_plan_exercises spe ON spe.plan_id = sp.id
    WHERE sp.student_id = auth.uid()
      AND spe.exercise_id = exercise_videos.exercise_id
  )
);

DROP POLICY IF EXISTS "exercise-videos select mentoria" ON storage.objects;
DROP POLICY IF EXISTS "Exercise videos read mentoria" ON storage.objects;
DROP POLICY IF EXISTS "exercise_videos_storage_select" ON storage.objects;
CREATE POLICY "Clientes com treino acessam arquivos de exercicios"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'exercise-videos'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'aluno_mentoria'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.exercise_videos ev
      JOIN public.student_plan_exercises spe ON spe.exercise_id = ev.exercise_id
      JOIN public.student_plans sp ON sp.id = spe.plan_id
      WHERE ev.video_path = storage.objects.name
        AND sp.student_id = auth.uid()
    )
  )
);