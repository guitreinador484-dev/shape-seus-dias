import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Course = Tables<"courses">;
export type CourseModule = Tables<"course_modules">;
export type CourseLesson = Tables<"course_lessons">;
export type LessonMaterial = Tables<"lesson_materials">;
export type LessonComment = Tables<"lesson_comments">;
export type LessonProgress = Tables<"lesson_progress">;
export type Enrollment = Tables<"course_enrollments">;
export type Certificate = Tables<"course_certificates">;

export type CourseFull = Course & {
  modules: (CourseModule & { lessons: CourseLesson[] })[];
};

export function slugify(v: string) {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

export async function listCoursesAdmin(): Promise<Course[]> {
  const { data, error } = await supabase.from("courses").select("*").order("order_index");
  if (error) throw error;
  return data ?? [];
}

export async function loadCourseFull(courseId: string): Promise<CourseFull | null> {
  const { data: course, error } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();
  if (error) throw error;
  if (!course) return null;
  const { data: modules } = await supabase
    .from("course_modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index");
  const modIds = (modules ?? []).map((m) => m.id);
  const { data: lessons } = modIds.length
    ? await supabase.from("course_lessons").select("*").in("module_id", modIds).order("order_index")
    : { data: [] as CourseLesson[] };
  return {
    ...course,
    modules: (modules ?? []).map((m) => ({ ...m, lessons: (lessons ?? []).filter((l) => l.module_id === m.id) })),
  };
}

export async function loadCourseBySlug(slug: string): Promise<CourseFull | null> {
  const { data: course } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle();
  if (!course) return null;
  return loadCourseFull(course.id);
}

export async function uploadCourseAsset(file: File, subfolder: string, courseId: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${courseId}/${subfolder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("course-assets").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function deleteCourseAsset(path: string | null | undefined) {
  if (!path) return;
  await supabase.storage.from("course-assets").remove([path]);
}

/** Remove todos os arquivos de storage de uma aula (vídeo, thumbnail e materiais). */
export async function deleteLessonAssets(lessonId: string) {
  const paths: string[] = [];
  const { data: lessons } = await supabase
    .from("course_lessons").select("video_path, thumbnail_path").eq("id", lessonId).limit(1);
  const lesson = lessons?.[0];
  if (lesson?.video_path) paths.push(lesson.video_path);
  if (lesson?.thumbnail_path) paths.push(lesson.thumbnail_path);
  const { data: mats } = await supabase
    .from("lesson_materials").select("file_path").eq("lesson_id", lessonId);
  for (const m of mats ?? []) if (m.file_path) paths.push(m.file_path);
  if (paths.length) await supabase.storage.from("course-assets").remove(paths);
}

/** Remove todos os arquivos de storage de um curso completo (capa, vídeos, thumbs, materiais). */
export async function deleteCourseAssets(course: CourseFull) {
  const paths: string[] = [];
  if (course.cover_path) paths.push(course.cover_path);
  const lessonIds: string[] = [];
  for (const m of course.modules) {
    for (const l of m.lessons) {
      lessonIds.push(l.id);
      if (l.video_path) paths.push(l.video_path);
      if (l.thumbnail_path) paths.push(l.thumbnail_path);
    }
  }
  if (lessonIds.length) {
    const { data: mats } = await supabase
      .from("lesson_materials").select("file_path").in("lesson_id", lessonIds);
    for (const m of mats ?? []) if (m.file_path) paths.push(m.file_path);
  }
  if (paths.length) await supabase.storage.from("course-assets").remove(paths);
}

export async function signedAsset(path: string | null | undefined, expires = 3600): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("course-assets").createSignedUrl(path, expires);
  return data?.signedUrl ?? null;
}

export async function listMyEnrollments(userId: string) {
  const { data } = await supabase
    .from("course_enrollments")
    .select("course_id, enrolled_at, courses(*)")
    .eq("user_id", userId);
  return (data ?? []) as unknown as (Enrollment & { courses: Course })[];
}

export async function listAllProfiles() {
  const { data } = await supabase.from("profiles").select("id, email, full_name").order("full_name");
  return data ?? [];
}

export async function listCourseEnrollments(courseId: string) {
  const { data } = await supabase
    .from("course_enrollments")
    .select("user_id, enrolled_at")
    .eq("course_id", courseId);
  return data ?? [];
}

export function isLessonUnlocked(lesson: CourseLesson, enrolledAt: string | null): boolean {
  if (!enrolledAt || !lesson.release_days) return true;
  const enroll = new Date(enrolledAt).getTime();
  const now = Date.now();
  const days = Math.floor((now - enroll) / (1000 * 60 * 60 * 24));
  return days >= lesson.release_days;
}

export function daysUntilUnlock(lesson: CourseLesson, enrolledAt: string | null): number {
  if (!enrolledAt) return 0;
  const enroll = new Date(enrolledAt).getTime();
  const now = Date.now();
  const days = Math.floor((now - enroll) / (1000 * 60 * 60 * 24));
  return Math.max(0, lesson.release_days - days);
}

/* ---------------- Continuar assistindo / recomendações ---------------- */

export type ContinueItem = {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  courseTitle: string;
  courseSlug: string;
  coverPath: string | null;
  thumbnailPath: string | null;
  watchedSeconds: number;
  durationSeconds: number | null;
  updatedAt: string;
  pct: number;
};

/** Aulas iniciadas e ainda não concluídas, mais recentes primeiro. */
export async function listContinueWatching(userId: string, limit = 8): Promise<ContinueItem[]> {
  const { data: rows } = await supabase
    .from("lesson_progress")
    .select("lesson_id, watched_seconds, updated_at, completed_at")
    .eq("user_id", userId)
    .is("completed_at", null)
    .gt("watched_seconds", 0)
    .order("updated_at", { ascending: false })
    .limit(limit);
  const list = rows ?? [];
  if (!list.length) return [];

  const { data: lessons } = await supabase
    .from("course_lessons")
    .select("id, title, duration_seconds, thumbnail_path, module_id")
    .in("id", list.map((r) => r.lesson_id));
  const lessonMap = new Map((lessons ?? []).map((l) => [l.id, l]));

  const moduleIds = [...new Set((lessons ?? []).map((l) => l.module_id))];
  const { data: modules } = moduleIds.length
    ? await supabase.from("course_modules").select("id, title, course_id").in("id", moduleIds)
    : { data: [] as { id: string; title: string; course_id: string }[] };
  const moduleMap = new Map((modules ?? []).map((m) => [m.id, m]));

  const courseIds = [...new Set((modules ?? []).map((m) => m.course_id))];
  const { data: courses } = courseIds.length
    ? await supabase.from("courses").select("id, title, slug, cover_path").in("id", courseIds)
    : { data: [] as { id: string; title: string; slug: string; cover_path: string | null }[] };
  const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));

  const items: ContinueItem[] = [];
  for (const r of list) {
    const lesson = lessonMap.get(r.lesson_id);
    if (!lesson) continue;
    const mod = moduleMap.get(lesson.module_id);
    const course = mod ? courseMap.get(mod.course_id) : undefined;
    if (!mod || !course) continue;
    const dur = lesson.duration_seconds ?? null;
    items.push({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      moduleTitle: mod.title,
      courseTitle: course.title,
      courseSlug: course.slug,
      coverPath: course.cover_path,
      thumbnailPath: lesson.thumbnail_path,
      watchedSeconds: r.watched_seconds ?? 0,
      durationSeconds: dur,
      updatedAt: r.updated_at,
      pct: dur ? Math.min(99, Math.round(((r.watched_seconds ?? 0) / dur) * 100)) : 5,
    });
  }
  return items;
}

export type RecommendedModule = {
  moduleId: string;
  moduleTitle: string;
  courseTitle: string;
  courseSlug: string;
  coverPath: string | null;
  totalLessons: number;
  completedLessons: number;
};

/**
 * Próximos módulos sugeridos: módulos ainda não finalizados dos cursos do aluno,
 * priorizando os que já foram iniciados (parcialmente concluídos).
 */
export async function listRecommendedModules(userId: string, courseIds: string[], limit = 8): Promise<RecommendedModule[]> {
  if (!courseIds.length) return [];
  const { data: courses } = await supabase
    .from("courses").select("id, title, slug, cover_path, order_index").in("id", courseIds).order("order_index");
  const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));

  const { data: modules } = await supabase
    .from("course_modules").select("id, title, course_id, order_index").in("course_id", courseIds).order("order_index");
  const mods = modules ?? [];
  if (!mods.length) return [];

  const { data: lessons } = await supabase
    .from("course_lessons").select("id, module_id").in("module_id", mods.map((m) => m.id));
  const lessonList = lessons ?? [];

  const { data: progress } = lessonList.length
    ? await supabase.from("lesson_progress").select("lesson_id, completed_at")
        .eq("user_id", userId).in("lesson_id", lessonList.map((l) => l.id))
    : { data: [] as { lesson_id: string; completed_at: string | null }[] };
  const doneIds = new Set((progress ?? []).filter((p) => p.completed_at).map((p) => p.lesson_id));

  const result: RecommendedModule[] = [];
  for (const m of mods) {
    const ls = lessonList.filter((l) => l.module_id === m.id);
    if (!ls.length) continue;
    const done = ls.filter((l) => doneIds.has(l.id)).length;
    if (done === ls.length) continue; // já concluído
    const course = courseMap.get(m.course_id);
    if (!course) continue;
    result.push({
      moduleId: m.id,
      moduleTitle: m.title,
      courseTitle: course.title,
      courseSlug: course.slug,
      coverPath: course.cover_path,
      totalLessons: ls.length,
      completedLessons: done,
    });
  }
  // iniciados primeiro, depois os intocados
  result.sort((a, b) => (b.completedLessons > 0 ? 1 : 0) - (a.completedLessons > 0 ? 1 : 0));
  return result.slice(0, limit);
}