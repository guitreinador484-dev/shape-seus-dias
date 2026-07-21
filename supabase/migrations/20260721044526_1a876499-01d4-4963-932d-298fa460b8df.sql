
-- ==== TABELAS ====
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  cover_path text,
  category text,
  is_published boolean NOT NULL DEFAULT false,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.course_modules(course_id, order_index);

CREATE TABLE public.course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_path text,
  thumbnail_path text,
  duration_seconds int,
  order_index int NOT NULL DEFAULT 0,
  release_days int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.course_lessons(module_id, order_index);

CREATE TABLE public.lesson_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_path text,
  external_url text,
  kind text NOT NULL DEFAULT 'file',
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.lesson_materials(lesson_id, order_index);

CREATE TABLE public.course_enrollments (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);
CREATE INDEX ON public.course_enrollments(course_id);

CREATE TABLE public.lesson_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  watched_seconds int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);
CREATE INDEX ON public.lesson_progress(lesson_id);

CREATE TABLE public.lesson_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.lesson_comments(lesson_id, created_at);

CREATE TABLE public.course_certificates (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE DEFAULT upper(substr(gen_random_uuid()::text, 1, 8)),
  issued_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);

-- ==== GRANTS ====
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_materials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_certificates TO authenticated;
GRANT ALL ON public.courses, public.course_modules, public.course_lessons, public.lesson_materials, public.course_enrollments, public.lesson_progress, public.lesson_comments, public.course_certificates TO service_role;

-- ==== RLS ENABLE ====
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;

-- ==== POLICIES ====
CREATE POLICY "Admins manage courses" ON public.courses FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Enrolled users read courses" ON public.courses FOR SELECT TO authenticated
  USING (is_published = true AND EXISTS (
    SELECT 1 FROM public.course_enrollments e WHERE e.course_id = courses.id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Admins manage modules" ON public.course_modules FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Enrolled users read modules" ON public.course_modules FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.course_enrollments e WHERE e.course_id = course_modules.course_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Admins manage lessons" ON public.course_lessons FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Enrolled users read lessons" ON public.course_lessons FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.course_modules m
    JOIN public.course_enrollments e ON e.course_id = m.course_id
    WHERE m.id = course_lessons.module_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Admins manage materials" ON public.lesson_materials FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Enrolled users read materials" ON public.lesson_materials FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.course_lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.course_enrollments e ON e.course_id = m.course_id
    WHERE l.id = lesson_materials.lesson_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Admins manage enrollments" ON public.course_enrollments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Users read own enrollments" ON public.course_enrollments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users manage own progress" ON public.lesson_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins view all progress" ON public.lesson_progress FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage comments" ON public.lesson_comments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Enrolled users read comments" ON public.lesson_comments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.course_lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.course_enrollments e ON e.course_id = m.course_id
    WHERE l.id = lesson_comments.lesson_id AND e.user_id = auth.uid()
  ));
CREATE POLICY "Enrolled users insert comments" ON public.lesson_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.course_lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.course_enrollments e ON e.course_id = m.course_id
    WHERE l.id = lesson_comments.lesson_id AND e.user_id = auth.uid()
  ));
CREATE POLICY "Users delete own comments" ON public.lesson_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users read own certificates" ON public.course_certificates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users insert own certificates" ON public.course_certificates FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage certificates all" ON public.course_certificates FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ==== TRIGGERS ====
CREATE TRIGGER courses_touch BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER modules_touch BEFORE UPDATE ON public.course_modules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER lessons_touch BEFORE UPDATE ON public.course_lessons FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER progress_touch BEFORE UPDATE ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
