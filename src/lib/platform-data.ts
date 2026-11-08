import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";

export type StudentPlan = Tables<"student_plans">;
export type StudentPlanExercise = Tables<"student_plan_exercises">;
export type Workout = Tables<"workouts">;
export type PlanWithExercises = StudentPlan & { exercises: StudentPlanExercise[] };

export type PlatformConfig = {
  hero_workout_id: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image_path: string;
  row_order: string;
  theme: "dark" | "light";
  announcement_enabled: boolean;
  announcement_text: string;
  announcement_type: "info" | "success" | "warning" | "purple";
  show_continue_watching: boolean;
};

export const defaultConfig: PlatformConfig = {
  hero_workout_id: "",
  hero_title: "",
  hero_subtitle: "",
  hero_image_path: "",
  row_order: "",
  theme: "dark",
  announcement_enabled: false,
  announcement_text: "",
  announcement_type: "info",
  show_continue_watching: true,
};

function readConfig(value: Json | null): PlatformConfig {
  const d =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const validAnnounceTypes = ["info", "success", "warning", "purple"];
  const annType =
    typeof d.platform_announcement_type === "string" &&
    validAnnounceTypes.includes(d.platform_announcement_type)
      ? (d.platform_announcement_type as PlatformConfig["announcement_type"])
      : "info";

  return {
    hero_workout_id:
      typeof d.platform_hero_workout_id === "string" ? d.platform_hero_workout_id : "",
    hero_title: typeof d.platform_hero_title === "string" ? d.platform_hero_title : "",
    hero_subtitle: typeof d.platform_hero_subtitle === "string" ? d.platform_hero_subtitle : "",
    hero_image_path:
      typeof d.platform_hero_image_path === "string" ? d.platform_hero_image_path : "",
    row_order: typeof d.platform_row_order === "string" ? d.platform_row_order : "",
    theme: d.platform_theme === "light" ? "light" : "dark",
    announcement_enabled:
      typeof d.platform_announcement_enabled === "boolean"
        ? d.platform_announcement_enabled
        : false,
    announcement_text:
      typeof d.platform_announcement_text === "string" ? d.platform_announcement_text : "",
    announcement_type: annType,
    show_continue_watching: d.platform_show_continue_watching !== false,
  };
}

export const platformHomeKey = (userId: string) => ["platform", "home", userId] as const;
export const platformLessonsKey = (userId: string) => ["platform", "lessons", userId] as const;

export type PlatformHome = {
  fullName: string;
  hasClassAccess: boolean;
  hasNutritionAccess: boolean;
  hasVideoAccess: boolean;
  isActive: boolean;
  accessExpiresAt: string | null;
  plans: PlanWithExercises[];
  config: PlatformConfig;
};

/** Tudo que a tela inicial do aluno precisa. Aulas em vídeo ficam para quando a aba for aberta. */
export async function fetchPlatformHome(userId: string): Promise<PlatformHome> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "full_name, has_class_access, is_active, access_expires_at, has_nutrition_access, has_video_access",
    )
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message || "Erro ao carregar perfil");

  const home: PlatformHome = {
    fullName: profile?.full_name?.trim() ?? "",
    hasClassAccess: Boolean(profile?.has_class_access),
    hasNutritionAccess: Boolean(profile?.has_nutrition_access),
    hasVideoAccess: Boolean(profile?.has_video_access),
    isActive: profile?.is_active ?? true,
    accessExpiresAt: profile?.access_expires_at ?? null,
    plans: [],
    config: defaultConfig,
  };
  const expired =
    home.accessExpiresAt !== null && new Date(home.accessExpiresAt).getTime() <= Date.now();
  if (!home.hasClassAccess || !home.isActive || expired) return home;

  const [plansRes, cfgRes] = await Promise.all([
    supabase
      .from("student_plans")
      .select("*")
      .eq("student_id", userId)
      .order("day_of_week", { ascending: true }),
    supabase
      .from("quiz_config")
      .select("content")
      .eq("section", "configuracoes")
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);
  if (plansRes.error) throw new Error(plansRes.error.message);
  if (cfgRes.error) throw new Error(cfgRes.error.message);

  const plans = plansRes.data ?? [];
  const planIds = plans.map((plan) => plan.id);
  const exercisesRes = planIds.length
    ? await supabase
        .from("student_plan_exercises")
        .select("*")
        .in("plan_id", planIds)
        .order("display_order", { ascending: true })
    : { data: [] as StudentPlanExercise[], error: null };
  if (exercisesRes.error) throw new Error(exercisesRes.error.message);

  const byPlan = new Map<string, StudentPlanExercise[]>();
  for (const exercise of exercisesRes.data ?? []) {
    byPlan.set(exercise.plan_id, [...(byPlan.get(exercise.plan_id) ?? []), exercise]);
  }
  home.plans = plans.map((plan) => ({ ...plan, exercises: byPlan.get(plan.id) ?? [] }));
  home.config = readConfig(cfgRes.data?.[0]?.content ?? null);
  return home;
}

/** Mantém o cache alinhado com a marcação de exercício, para voltar à tela sem perder o estado. */
export function setExerciseCompletion(
  queryClient: QueryClient,
  userId: string,
  exerciseId: string,
  completedAt: string | null,
) {
  queryClient.setQueryData<PlatformHome>(platformHomeKey(userId), (current) =>
    current
      ? {
          ...current,
          plans: current.plans.map((plan) => ({
            ...plan,
            exercises: plan.exercises.map((exercise) =>
              exercise.id === exerciseId ? { ...exercise, completed_at: completedAt } : exercise,
            ),
          })),
        }
      : current,
  );
}

/** O plano se repete toda semana: a marcação vale até o domingo e zera na segunda. */
export function startOfTrainingWeek(now = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

export function isDoneThisWeek(completedAt: string | null | undefined, now = new Date()): boolean {
  return (
    Boolean(completedAt) &&
    new Date(completedAt as string).getTime() >= startOfTrainingWeek(now).getTime()
  );
}

export type WorkoutProgress = { watched_seconds: number; completed_at: string | null };

export type PlatformLessons = {
  workouts: Workout[];
  progress: Record<string, WorkoutProgress>;
  signedUrls: Record<string, { video?: string; thumb?: string }>;
  heroBannerUrl: string;
};

const SIGNED_URL_SECONDS = 3600;
/** Reaproveita o link só enquanto ele ainda tem folga antes de expirar. */
export const LESSONS_STALE_MS = 45 * 60 * 1000;

async function signPaths(bucket: string, paths: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(paths));
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(unique, SIGNED_URL_SECONDS);
  if (error) throw new Error(error.message);
  return new Map(
    (data ?? []).flatMap((row) =>
      row.path && row.signedUrl ? [[row.path, row.signedUrl] as const] : [],
    ),
  );
}

/** Uma requisição por bucket, em vez de uma por arquivo. */
export async function fetchPlatformLessons(
  userId: string,
  heroImagePath: string,
): Promise<PlatformLessons> {
  const [workoutsRes, progressRes] = await Promise.all([
    supabase.from("workouts").select("*").order("display_order", { ascending: true }),
    supabase
      .from("workout_progress")
      .select("workout_id, watched_seconds, completed_at")
      .eq("user_id", userId),
  ]);
  if (workoutsRes.error) throw new Error(workoutsRes.error.message);
  if (progressRes.error) throw new Error(progressRes.error.message);

  const workouts = workoutsRes.data ?? [];
  const [videos, thumbs] = await Promise.all([
    signPaths(
      "workout-videos",
      workouts.flatMap((w) => (w.video_path ? [w.video_path] : [])),
    ),
    signPaths("workout-thumbnails", [
      ...workouts.flatMap((w) => (w.thumbnail_path ? [w.thumbnail_path] : [])),
      ...(heroImagePath ? [heroImagePath] : []),
    ]),
  ]);

  return {
    workouts,
    progress: Object.fromEntries(
      (progressRes.data ?? []).map((row) => [
        row.workout_id,
        { watched_seconds: row.watched_seconds, completed_at: row.completed_at },
      ]),
    ),
    signedUrls: Object.fromEntries(
      workouts.map((w) => [
        w.id,
        {
          video: w.video_path ? videos.get(w.video_path) : undefined,
          thumb: w.thumbnail_path ? thumbs.get(w.thumbnail_path) : undefined,
        },
      ]),
    ),
    heroBannerUrl: heroImagePath ? (thumbs.get(heroImagePath) ?? "") : "",
  };
}
