import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeName, pickVideo, signedVideoUrl } from "@/lib/exercise-videos";

/** Shared selection keeps the preview and the player on the same recording. */
export function useExerciseVideo(exerciseName: string, exerciseId: string | null | undefined, gymId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["exercise-execution-video", exerciseId ?? normalizeName(exerciseName), gymId],
    enabled,
    staleTime: 45 * 60 * 1000,
    gcTime: 50 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const normalized = normalizeName(exerciseName);
      let query = supabase.from("exercises").select("*");
      query = exerciseId ? query.eq("id", exerciseId) : query.eq("name_normalized", normalized);
      const { data: linkedExercise, error } = await query.maybeSingle();
      if (error) throw error;
      let exercise = linkedExercise;
      if (!exercise && exerciseId) {
        const { data, error: lookupError } = await supabase.from("exercises").select("*").eq("name_normalized", normalized).maybeSingle();
        if (lookupError) throw lookupError;
        exercise = data;
      }
      if (!exercise) return { exercise: null, video: null, url: null };
      const { data: videos, error: videoError } = await supabase.from("exercise_videos").select("*").eq("exercise_id", exercise.id);
      if (videoError) throw videoError;
      const video = pickVideo(videos ?? [], gymId, true);
      const url = video ? await signedVideoUrl(video.video_path) : null;
      return { exercise, video, url };
    },
  });
}