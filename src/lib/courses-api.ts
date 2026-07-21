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

export async function uploadCourseAsset(file: File, subfolder: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${subfolder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("course-assets").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function deleteCourseAsset(path: string | null | undefined) {
  if (!path) return;
  await supabase.storage.from("course-assets").remove([path]);
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