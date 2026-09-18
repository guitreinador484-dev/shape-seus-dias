import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Exercise = Tables<"exercises">;
export type Gym = Tables<"gyms">;
export type ExerciseVideo = Tables<"exercise_videos">;

export const VIDEO_BUCKET = "exercise-videos";

/** Tamanho máximo aceito para cada vídeo (configurável). */
export const MAX_VIDEO_MB = 200;

export const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm";

export const MUSCLE_GROUPS = [
  "Peito",
  "Costas",
  "Pernas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Abdômen",
  "Glúteos",
  "Cardio",
  "Outros",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/* -------------------------------------------------------------- exercícios */

export async function listExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase.from("exercises").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createExercise(input: { name: string; muscle_group: string; description?: string | null }) {
  const { data, error } = await supabase
    .from("exercises")
    .insert({ ...input, name: tidyName(input.name), name_normalized: normalizeName(input.name) })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Remove espaços extras e deixa a primeira letra maiúscula. */
export function tidyName(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : clean;
}

/**
 * Procura o exercício pelo nome (ignorando acentos, maiúsculas e espaços)
 * e cria um novo quando ainda não existe. Tudo em uma única operação.
 */
export async function findOrCreateExercise(
  name: string,
  muscleGroup?: string | null,
): Promise<{ exercise: Exercise; created: boolean }> {
  const norm = normalizeName(name);
  if (!norm) throw new Error("Informe o nome do exercício.");

  const { data: existing } = await supabase
    .from("exercises")
    .select("*")
    .eq("name_normalized", norm)
    .maybeSingle();
  if (existing) return { exercise: existing as Exercise, created: false };

  const { data, error } = await supabase.rpc("find_or_create_exercise", {
    _name: name,
    _muscle_group: muscleGroup ?? undefined,
  });
  if (error) throw error;
  return { exercise: data as unknown as Exercise, created: true };
}

/** Junta dois exercícios repetidos: vídeos e treinos passam para o que fica. */
export async function mergeExercises(fromId: string, keepId: string) {
  if (fromId === keepId) return;
  const v = await supabase.from("exercise_videos").update({ exercise_id: keepId }).eq("exercise_id", fromId);
  if (v.error) throw v.error;
  const s = await supabase.from("student_plan_exercises").update({ exercise_id: keepId }).eq("exercise_id", fromId);
  if (s.error) throw s.error;
  const d = await supabase.from("exercises").delete().eq("id", fromId);
  if (d.error) throw d.error;
}

export async function updateExercise(id: string, input: { name?: string; muscle_group?: string; description?: string | null }) {
  const { error } = await supabase.from("exercises").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteExercise(id: string) {
  const { error } = await supabase.from("exercises").delete().eq("id", id);
  if (error) throw error;
}

/* --------------------------------------------------------------- academias */

export async function listGyms(): Promise<Gym[]> {
  const { data, error } = await supabase.from("gyms").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createGym(input: { name: string; neighborhood?: string | null; is_active?: boolean }) {
  const { data, error } = await supabase.from("gyms").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateGym(id: string, input: { name?: string; neighborhood?: string | null; is_active?: boolean }) {
  const { error } = await supabase.from("gyms").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteGym(id: string) {
  const { error } = await supabase.from("gyms").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ vídeos */

export async function listVideos(): Promise<ExerciseVideo[]> {
  const { data, error } = await supabase.from("exercise_videos").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listVideosForExercises(exerciseIds: string[]): Promise<ExerciseVideo[]> {
  if (exerciseIds.length === 0) return [];
  const { data, error } = await supabase.from("exercise_videos").select("*").in("exercise_id", exerciseIds);
  if (error) throw error;
  return data ?? [];
}

export async function createVideo(input: {
  exercise_id: string;
  gym_id: string | null;
  title?: string | null;
  notes?: string | null;
  video_path: string;
}) {
  const { error } = await supabase.from("exercise_videos").insert(input);
  if (error) throw error;
}

export async function updateVideo(
  id: string,
  input: { exercise_id?: string; gym_id?: string | null; title?: string | null; notes?: string | null; video_path?: string },
) {
  const { error } = await supabase.from("exercise_videos").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteVideo(video: ExerciseVideo) {
  const { error } = await supabase.from("exercise_videos").delete().eq("id", video.id);
  if (error) throw error;
  await supabase.storage.from(VIDEO_BUCKET).remove([video.video_path]).catch(() => undefined);
}

/** Gera o link temporário para assistir ao vídeo (arquivos ficam privados). */
export async function signedVideoUrl(path: string, expiresIn = 60 * 60): Promise<string | null> {
  const { data, error } = await supabase.storage.from(VIDEO_BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Envia o arquivo com barra de progresso real (XHR direto no Storage). */
export async function uploadVideoFile(file: File, onProgress: (percent: number) => void): Promise<string> {
  const ext = (file.name.split(".").pop() ?? "mp4").toLowerCase();
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const baseUrl = import.meta.env['VITE_SUPABASE_URL'] as string;
  const apiKey = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] as string;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${baseUrl}/storage/v1/object/${VIDEO_BUCKET}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", apiKey);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Falha no envio do vídeo (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Falha de conexão ao enviar o vídeo."));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });

  return path;
}

/* ------------------------------------------------ academia escolhida pelo aluno */

export async function getMyGym(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("user_gym_preference")
    .select("gym_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.gym_id ?? null;
}

export async function setMyGym(userId: string, gymId: string | null) {
  const { error } = await supabase
    .from("user_gym_preference")
    .upsert({ user_id: userId, gym_id: gymId }, { onConflict: "user_id" });
  if (error) throw error;
}

/**
 * Escolhe o melhor vídeo: primeiro o da academia do aluno, depois o genérico.
 */
export function pickVideo(videos: ExerciseVideo[], gymId: string | null): ExerciseVideo | null {
  if (gymId) {
    const specific = videos.find((v) => v.gym_id === gymId);
    if (specific) return specific;
  }
  return videos.find((v) => v.gym_id === null) ?? null;
}

export function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
